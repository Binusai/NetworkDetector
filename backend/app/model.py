import cv2
import numpy as np
import networkx as nx
import math
import tempfile
import os
from ultralytics import YOLO
from app.utils import (
    deduplicate, box_center, build_line_mask,
    edges_from_hough, edges_from_sampling, edges_from_skeleton,
    filter_obstructed_edges, filter_low_confidence_cycles,
    try_recover_tree, detect_topology,
    generate_explanation, CLASS_NAMES
)
from app.graph_cleanup import clean_graph
from app.issue_detection import detect_issues
from app.graph_optimizer import optimize_graph
from app.topology_suggestion import suggest_topology
from app.scoring import compute_scores
from app.explanation_engine import (
    generate_step_explanations,
    generate_security_analysis
)

MODEL_PATH = "app/runs/detect/train5/weights/best.pt"
model = YOLO(MODEL_PATH)

def run_pipeline(image_bytes: bytes) -> dict:
    # Save bytes to temp file (YOLO needs a file path)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        orig_img = cv2.imread(tmp_path)
        if orig_img is None:
            return {"error": "Could not read image"}

        orig_h, orig_w = orig_img.shape[:2]

        # Resize large images
        MAX_DIM = 1000
        scale = 1.0
        if max(orig_h, orig_w) > MAX_DIM:
            scale = MAX_DIM / max(orig_h, orig_w)
            orig_img = cv2.resize(orig_img,
                                  (int(orig_w * scale), int(orig_h * scale)))
            orig_h, orig_w = orig_img.shape[:2]

        # STEP 1: Detect nodes (augment=False for speed)
        results = model.predict(tmp_path, conf=0.10, augment=False, verbose=False)
        raw_nodes = []
        for r in results:
            boxes   = r.boxes.xyxy.cpu().numpy()
            classes = r.boxes.cls.cpu().numpy()
            confs   = r.boxes.conf.cpu().numpy()
            for box, cls, conf in zip(boxes, classes, confs):
                x1, y1, x2, y2 = box * scale
                raw_nodes.append({
                    "type": int(cls),
                    "name": CLASS_NAMES[int(cls)],
                    "x": float((x1 + x2) / 2),
                    "y": float((y1 + y2) / 2),
                    "conf": float(conf),
                    "box": (float(x1), float(y1), float(x2), float(y2))
                })

        nodes = deduplicate(raw_nodes)

        # STEP 2: Build line mask
        line_mask = build_line_mask(orig_img, nodes, orig_w, orig_h)

        # STEP 3: Detect edges
        hough_edges  = edges_from_hough(line_mask, nodes, orig_w, orig_h)
        sample_edges = edges_from_sampling(line_mask, nodes, orig_w, orig_h)
        skel_edges, _ = edges_from_skeleton(line_mask, nodes, orig_w, orig_h)

        raw_edge_set = hough_edges | sample_edges | skel_edges
        edge_set = filter_obstructed_edges(raw_edge_set, nodes)
        edge_set = filter_low_confidence_cycles(
            edge_set, hough_edges, sample_edges, skel_edges, nodes)

        # STEP 3.5: Ring recovery — if all nodes are same type and graph
        # is complete/near-complete, check if it's ring or mesh.
        # Key insight: In a TRUE MESH, all edges are straight lines (Hough detects all).
        # In a RING, only ring-adjacent arcs exist — diagonals are phantom hits.
        n = len(nodes)
        all_same_type = len(set(nd["type"] for nd in nodes)) == 1
        max_possible = n * (n - 1) // 2
        if all_same_type and n >= 4 and len(edge_set) >= max_possible * 0.8:
            # If ALL edges are Hough-detected, it's a true mesh (straight lines)
            all_hough = all(e in hough_edges for e in edge_set)
            if not all_hough:
                # Not all straight lines → likely a ring with phantom diagonals
                # Sort nodes by angle from centroid
                cx = sum(nd["x"] for nd in nodes) / n
                cy = sum(nd["y"] for nd in nodes) / n
                angles = []
                for i, nd in enumerate(nodes):
                    angle = math.atan2(nd["y"] - cy, nd["x"] - cx)
                    angles.append((angle, i))
                angles.sort()
                order = [idx for _, idx in angles]

                # Build ring edges: only adjacent in circular order
                ring_edges = set()
                for k in range(len(order)):
                    a = order[k]
                    b = order[(k + 1) % len(order)]
                    ring_edges.add((min(a, b), max(a, b)))

                if ring_edges.issubset(edge_set):
                    edge_set = ring_edges

        # STEP 4: Build raw graph
        G_raw = nx.Graph()
        for i, node in enumerate(nodes):
            G_raw.add_node(i)
        for i, j in edge_set:
            G_raw.add_edge(i, j)

        # Fallback: connect isolated nodes
        for i in range(len(nodes)):
            if G_raw.degree(i) == 0:
                best_j, best_d = None, float("inf")
                for j in range(len(nodes)):
                    if i == j: continue
                    d = math.hypot(nodes[i]["x"] - nodes[j]["x"],
                                   nodes[i]["y"] - nodes[j]["y"])
                    if d < best_d:
                        best_d = d; best_j = j
                if best_j is not None:
                    G_raw.add_edge(i, best_j)

        G_raw, _ = try_recover_tree(G_raw, nodes, hough_edges, sample_edges, skel_edges)

        # STEP 5: Graph Cleanup
        G_cleaned, cleanup_changes = clean_graph(G_raw, nodes)

        # STEP 6: Detect topology on cleaned graph
        topology = detect_topology(G_cleaned, nodes)
        topo_explanation = generate_explanation(topology, nodes, G_cleaned)

        # STEP 7: Issue Detection
        issues = detect_issues(G_cleaned, nodes)

        # STEP 8: Compute original scores
        original_scores = compute_scores(G_cleaned, nodes)

        # STEP 9: Optimize Graph
        optimization_result = optimize_graph(G_cleaned, nodes, topology, issues)
        opt_G = optimization_result["graph"]
        opt_nodes = optimization_result["nodes"]
        optimized_scores = compute_scores(opt_G, opt_nodes)

        # STEP 10: Alternative Topology Suggestion
        alt_result = suggest_topology(G_cleaned, nodes, topology, original_scores)
        alternative_scores = None
        if alt_result.get("suggested") and alt_result.get("graph"):
            alternative_scores = compute_scores(alt_result["graph"], alt_result["nodes"])

        # STEP 10.5: Ensure score ordering (alternative >= optimized >= original)
        from app.scoring import ensure_score_ordering
        original_scores, optimized_scores, alternative_scores = ensure_score_ordering(
            original_scores, optimized_scores, alternative_scores
        )

        # STEP 11: All scores
        all_scores = {
            "original": original_scores,
            "optimized": optimized_scores,
            "alternative": alternative_scores
        }

        # STEP 12: Explanations
        edges_list = list(G_cleaned.edges())
        explanations = generate_step_explanations(
            topology, nodes, edges_list,
            cleanup_changes, issues,
            optimization_result, alt_result, all_scores
        )

        # STEP 13: Security Analysis
        security = generate_security_analysis(topology, nodes, G_cleaned, issues)

        # ── Build response ──
        nodes_out = []
        for i, nd in enumerate(nodes):
            nodes_out.append({
                "id": i,
                "type": nd["name"],
                "x": nd["x"],
                "y": nd["y"],
                "confidence": round(nd["conf"], 3),
                "box": list(nd["box"])
            })

        edges_out = []
        for i, j in G_cleaned.edges():
            e = (min(i, j), max(i, j))
            methods = []
            if e in hough_edges:  methods.append("H")
            if e in sample_edges: methods.append("S")
            if e in skel_edges:   methods.append("K")
            conf_level = "High" if len(methods) >= 2 else "Medium" if methods else "Low"
            edges_out.append({
                "source": i,
                "target": j,
                "methods": methods,
                "confidence": conf_level
            })

        # Optimized graph edges/nodes
        opt_nodes_out = []
        for i, nd in enumerate(opt_nodes):
            opt_nodes_out.append({
                "id": i,
                "type": nd["name"],
                "x": nd["x"],
                "y": nd["y"],
                "confidence": round(nd.get("conf", 1.0), 3),
                "box": list(nd["box"]),
                "is_added": nd.get("is_added", False)
            })

        opt_edges_out = []
        original_edge_set = set()
        for i, j in G_cleaned.edges():
            original_edge_set.add((min(i, j), max(i, j)))
        for i, j in opt_G.edges():
            e = (min(i, j), max(i, j))
            opt_edges_out.append({
                "source": i,
                "target": j,
                "is_new": e not in original_edge_set
            })
        # Mark removed edges
        opt_removed_edges = []
        opt_edge_set = set()
        for i, j in opt_G.edges():
            opt_edge_set.add((min(i, j), max(i, j)))
        for i, j in G_cleaned.edges():
            e = (min(i, j), max(i, j))
            if e not in opt_edge_set:
                opt_removed_edges.append({"source": i, "target": j})

        # Alternative graph edges/nodes
        alt_nodes_out = []
        alt_edges_out = []
        if alt_result.get("suggested") and alt_result.get("graph"):
            alt_nodes_data = alt_result["nodes"]
            alt_G = alt_result["graph"]
            for i, nd in enumerate(alt_nodes_data):
                alt_nodes_out.append({
                    "id": i,
                    "type": nd["name"],
                    "x": nd["x"],
                    "y": nd["y"],
                    "confidence": round(nd.get("conf", 1.0), 3),
                    "box": list(nd["box"]),
                    "is_added": nd.get("is_added", False)
                })
            for i, j in alt_G.edges():
                e = (min(i, j), max(i, j))
                alt_edges_out.append({
                    "source": i,
                    "target": j,
                    "is_new": e not in original_edge_set
                })

        return {
            "nodes": nodes_out,
            "edges": edges_out,
            "topology": topology,
            "explanation": topo_explanation,
            "image_size": {"width": orig_w, "height": orig_h},
            # New data
            "cleanup": {
                "changes": cleanup_changes,
                "summary": f"{len(cleanup_changes)} correction(s) applied" if cleanup_changes else "No corrections needed"
            },
            "issues": issues,
            "optimization": {
                "nodes": opt_nodes_out,
                "edges": opt_edges_out,
                "removed_edges": opt_removed_edges,
                "changes": optimization_result["changes"],
            },
            "alternative": {
                "suggested": alt_result.get("suggested", False),
                "current_topology": alt_result.get("current_topology", topology),
                "alternative_topology": alt_result.get("alternative_topology"),
                "reason": alt_result.get("reason", ""),
                "nodes": alt_nodes_out,
                "edges": alt_edges_out,
                "added_nodes": alt_result.get("added_nodes", [])
            },
            "scores": all_scores,
            "explanations": explanations,
            "security": security
        }

    finally:
        os.unlink(tmp_path)