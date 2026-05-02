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
    generate_explanation, generate_security_warnings,
    CLASS_NAMES
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

        # STEP 1: Detect nodes
        results = model.predict(tmp_path, conf=0.10, augment=True, verbose=False)
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

        # STEP 4: Build graph
        G = nx.Graph()
        for i, node in enumerate(nodes):
            G.add_node(i)
        for i, j in edge_set:
            G.add_edge(i, j)

        # Fallback: connect isolated nodes
        for i in range(len(nodes)):
            if G.degree(i) == 0:
                best_j, best_d = None, float("inf")
                for j in range(len(nodes)):
                    if i == j: continue
                    d = math.hypot(nodes[i]["x"] - nodes[j]["x"],
                                   nodes[i]["y"] - nodes[j]["y"])
                    if d < best_d:
                        best_d = d; best_j = j
                if best_j is not None:
                    G.add_edge(i, best_j)

        G, _ = try_recover_tree(G, nodes, hough_edges, sample_edges, skel_edges)

        topology = detect_topology(G, nodes)
        explanation = generate_explanation(topology, nodes, G)
        warnings = generate_security_warnings(topology, nodes, G)

        # Build response
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
        for i, j in G.edges():
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

        return {
            "nodes": nodes_out,
            "edges": edges_out,
            "topology": topology,
            "explanation": explanation,
            "security_warnings": warnings,
            "image_size": {"width": orig_w, "height": orig_h}
        }

    finally:
        os.unlink(tmp_path)