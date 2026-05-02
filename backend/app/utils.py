import cv2
import numpy as np
import networkx as nx
import math
from skimage.morphology import skeletonize

CLASS_NAMES = {0: "computer", 1: "hub", 2: "switch", 3: "router"}

def deduplicate(raw_nodes, iou_thresh=0.4):
    sorted_nodes = sorted(raw_nodes, key=lambda n: n["conf"], reverse=True)
    kept = []
    for candidate in sorted_nodes:
        cx1, cy1, cx2, cy2 = candidate["box"]
        dup = False
        for k in kept:
            kx1, ky1, kx2, ky2 = k["box"]
            ix1 = max(cx1, kx1); iy1 = max(cy1, ky1)
            ix2 = min(cx2, kx2); iy2 = min(cy2, ky2)
            if ix2 <= ix1 or iy2 <= iy1:
                continue
            inter = (ix2 - ix1) * (iy2 - iy1)
            union = ((cx2-cx1)*(cy2-cy1) + (kx2-kx1)*(ky2-ky1) - inter)
            if union > 0 and inter / union > iou_thresh:
                dup = True
                break
        if not dup:
            kept.append(candidate)
    return kept

def box_center(node):
    x1, y1, x2, y2 = node["box"]
    return float((x1 + x2) / 2), float((y1 + y2) / 2)

def expand_box(node, pad=12, w=None, h=None):
    x1, y1, x2, y2 = node["box"]
    x1i = max(0, int(x1) - pad)
    y1i = max(0, int(y1) - pad)
    x2i = int(x2) + pad if w is None else min(w, int(x2) + pad)
    y2i = int(y2) + pad if h is None else min(h, int(y2) + pad)
    return x1i, y1i, x2i, y2i

def point_in_box(px, py, node, pad=0):
    x1, y1, x2, y2 = node["box"]
    return (x1 - pad) <= px <= (x2 + pad) and (y1 - pad) <= py <= (y2 + pad)

def segment_intersects_box(ax, ay, bx, by, node, pad=5):
    x1, y1, x2, y2 = node["box"]
    rx1 = x1 - pad; ry1 = y1 - pad
    rx2 = x2 + pad; ry2 = y2 + pad
    dx = bx - ax; dy = by - ay
    tmin, tmax = 0.0, 1.0
    for p, q in [(-dx, ax - rx1), (dx, rx2 - ax),
                 (-dy, ay - ry1), (dy, ry2 - ay)]:
        if p == 0:
            if q < 0:
                return False
        else:
            t = q / p
            if p < 0:
                tmin = max(tmin, t)
            else:
                tmax = min(tmax, t)
        if tmin > tmax:
            return False
    return True

def is_obstructed(i, j, nodes):
    ax, ay = box_center(nodes[i])
    bx, by = box_center(nodes[j])
    for k, node in enumerate(nodes):
        if k == i or k == j:
            continue
        if segment_intersects_box(ax, ay, bx, by, node, pad=8):
            return True
    return False

def build_line_mask(orig_img, nodes, orig_w, orig_h):
    gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    adapt = cv2.adaptiveThreshold(gray, 255,
                                   cv2.ADAPTIVE_THRESH_MEAN_C,
                                   cv2.THRESH_BINARY_INV, 15, 8)
    mean_val = np.mean(gray)
    if mean_val > 180:
        _, global_mask = cv2.threshold(gray, 175, 255, cv2.THRESH_BINARY_INV)
    elif mean_val > 100:
        _, global_mask = cv2.threshold(gray, 145, 255, cv2.THRESH_BINARY_INV)
    else:
        _, global_mask = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY)
    line_mask = cv2.bitwise_or(adapt, global_mask)
    canny = cv2.Canny(gray, 25, 100)
    line_mask = cv2.bitwise_or(line_mask, canny)
    pad = 10
    for node in nodes:
        x1i, y1i, x2i, y2i = expand_box(node, pad=pad, w=orig_w, h=orig_h)
        line_mask[y1i:y2i, x1i:x2i] = 0
    kernel = np.ones((3, 3), np.uint8)
    line_mask = cv2.morphologyEx(line_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    return line_mask

def edges_from_hough(line_mask, nodes, orig_w, orig_h, grow_px=28):
    edges = set()
    kern = np.ones((3, 3), np.uint8)
    mask_h = cv2.dilate(line_mask, kern, iterations=1)
    lines = cv2.HoughLinesP(
        mask_h, rho=1, theta=np.pi/180,
        threshold=20, minLineLength=18, maxLineGap=45)
    if lines is None:
        return edges
    for seg in lines:
        x1, y1, x2, y2 = seg[0]
        near_start, near_end = [], []
        for i, node in enumerate(nodes):
            ex1, ey1, ex2, ey2 = expand_box(node, pad=grow_px, w=orig_w, h=orig_h)
            if ex1 <= x1 <= ex2 and ey1 <= y1 <= ey2:
                near_start.append(i)
            if ex1 <= x2 <= ex2 and ey1 <= y2 <= ey2:
                near_end.append(i)
        for a in near_start:
            for b in near_end:
                if a != b:
                    edges.add((min(a, b), max(a, b)))
    return edges

def edges_from_sampling(line_mask, nodes, orig_w, orig_h,
                         sample_n=100, threshold_ratio=0.18):
    edges = set()
    n = len(nodes)
    for i in range(n):
        for j in range(i + 1, n):
            if is_obstructed(i, j, nodes):
                continue
            cx1, cy1 = box_center(nodes[i])
            cx2, cy2 = box_center(nodes[j])
            xs = np.linspace(cx1, cx2, sample_n)
            ys = np.linspace(cy1, cy2, sample_n)
            line_hits = 0
            valid_samples = 0
            for x, y in zip(xs, ys):
                xi, yi = int(round(x)), int(round(y))
                if xi < 0 or xi >= orig_w or yi < 0 or yi >= orig_h:
                    continue
                if point_in_box(x, y, nodes[i], pad=5):
                    continue
                if point_in_box(x, y, nodes[j], pad=5):
                    continue
                valid_samples += 1
                if line_mask[yi, xi] > 0:
                    line_hits += 1
            if valid_samples > 5 and (line_hits / valid_samples) >= threshold_ratio:
                edges.add((i, j))
    return edges

def edges_from_skeleton(line_mask, nodes, orig_w, orig_h, grow_px=30):
    edges = set()
    skel_bool = skeletonize(line_mask > 0)
    skeleton = skel_bool.astype(np.uint8) * 255
    num_labels, labels = cv2.connectedComponents(skeleton)
    kern = np.ones((grow_px * 2 + 1, grow_px * 2 + 1), np.uint8)
    for label_id in range(1, num_labels):
        seg_mask = ((labels == label_id).astype(np.uint8)) * 255
        if np.sum(seg_mask > 0) < 15:
            continue
        ys_px, xs_px = np.where(seg_mask > 0)
        touched_nodes = []
        dilated = cv2.dilate(seg_mask, kern)
        for i, node in enumerate(nodes):
            x1i, y1i, x2i, y2i = expand_box(node, pad=10, w=orig_w, h=orig_h)
            if np.any(dilated[y1i:y2i, x1i:x2i] > 0):
                touched_nodes.append(i)
        if len(touched_nodes) < 2:
            continue
        if len(touched_nodes) == 2:
            i, j = touched_nodes[0], touched_nodes[1]
            edges.add((min(i, j), max(i, j)))
        else:
            pts = np.column_stack((xs_px, ys_px))
            if len(pts) > 1:
                mean_pt = pts.mean(axis=0)
                centered = pts - mean_pt
                _, _, vt = np.linalg.svd(centered, full_matrices=False)
                axis = vt[0]
                projections = centered @ axis
                end1_pt = pts[np.argmin(projections)]
                end2_pt = pts[np.argmax(projections)]
            else:
                end1_pt = end2_pt = pts[0]

            def closest_node(pt, candidate_nodes):
                best_i, best_d = None, float("inf")
                for k in candidate_nodes:
                    cx, cy = box_center(nodes[k])
                    d = math.hypot(pt[0] - cx, pt[1] - cy)
                    if d < best_d:
                        best_d = d; best_i = k
                return best_i

            n1 = closest_node(end1_pt, touched_nodes)
            n2 = closest_node(end2_pt, touched_nodes)
            if n1 is not None and n2 is not None and n1 != n2:
                edges.add((min(n1, n2), max(n1, n2)))
    return edges, skeleton

def filter_obstructed_edges(edge_set, nodes):
    filtered = set()
    for (i, j) in edge_set:
        if not is_obstructed(i, j, nodes):
            filtered.add((i, j))
    return filtered

def filter_low_confidence_cycles(edge_set, hough_edges, sample_edges, skel_edges, nodes):
    if not edge_set:
        return edge_set

    def score(e):
        return (int(e in hough_edges) +
                int(e in sample_edges) +
                int(e in skel_edges))

    n = len(nodes)
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        px, py = find(x), find(y)
        if px == py:
            return False
        parent[px] = py
        return True

    result = set()
    high_conf = {e for e in edge_set if score(e) >= 2 or e in hough_edges}
    low_conf = edge_set - high_conf
    for e in sorted(high_conf, key=score, reverse=True):
        union(e[0], e[1])
        result.add(e)
    for e in sorted(low_conf, key=score, reverse=True):
        if union(e[0], e[1]):
            result.add(e)
    return result

def try_recover_tree(G, nodes, hough_edges, sample_edges, skel_edges):
    n = G.number_of_nodes()
    if G.number_of_edges() != n:
        return G, False
    types = {nodes[i]["type"] for i in range(len(nodes))}
    if not (types & {1, 2, 3}):
        return G, False

    def edge_score(u, v):
        e = (min(u, v), max(u, v))
        return (int(e in hough_edges) +
                int(e in sample_edges) +
                int(e in skel_edges))

    candidates = sorted(G.edges(), key=lambda e: edge_score(e[0], e[1]))
    for u, v in candidates:
        G2 = G.copy()
        G2.remove_edge(u, v)
        if nx.is_connected(G2) and nx.is_tree(G2):
            return G2, True
    return G, False

def detect_topology(G, nodes):
    n = len(G.nodes())
    if n == 0:
        return "No nodes detected"
    if not nx.is_connected(G):
        types = {nd["type"] for nd in nodes}
        if types & {1, 2, 3}:
            return "Hybrid Topology"
        return "Disconnected / Unknown"
    degs = [d for _, d in G.degree()]
    max_d = max(degs)
    min_d = min(degs)
    leaves = degs.count(1)
    types = {nd["type"] for nd in nodes}
    e = G.number_of_edges()
    if all(d == 2 for d in degs):
        return "Ring Topology"
    if leaves == 2 and all(d <= 2 for d in degs):
        return "Bus Topology"
    if max_d == n - 1 and leaves == n - 1:
        return "Star Topology"
    if max_d >= n - 2 and leaves >= n - 2:
        return "Star Topology"
    if e == n * (n - 1) // 2:
        return "Mesh Topology (Full)"
    if nx.is_tree(G) and types & {1, 2, 3}:
        return "Tree Topology"
    if not nx.is_tree(G) and min_d >= 2:
        return "Mesh Topology (Partial)"
    hub_count = sum(1 for nd in nodes if nd["type"] in (1, 2, 3))
    if hub_count > 1:
        return "Hybrid Topology"
    return "Hybrid / Unknown"

def generate_explanation(topology, nodes, G):
    degs = dict(G.degree())
    type_counts = {}
    for nd in nodes:
        t = nd["name"]
        type_counts[t] = type_counts.get(t, 0) + 1
    counts_str = ", ".join(f"{v} {k}(s)" for k, v in type_counts.items())

    if topology == "Star Topology":
        center = max(degs, key=degs.get)
        return (f"Detected Star Topology because node {center} "
                f"({nodes[center]['name']}) is connected to all others, "
                f"and all other nodes have degree 1. "
                f"Devices found: {counts_str}.")
    elif topology == "Bus Topology":
        return (f"Detected Bus Topology because all devices are connected "
                f"along a single path with exactly 2 endpoints. "
                f"Devices found: {counts_str}.")
    elif topology == "Ring Topology":
        return (f"Detected Ring Topology because every node has degree 2, "
                f"forming a closed loop. "
                f"Devices found: {counts_str}.")
    elif "Mesh" in topology:
        return (f"Detected {topology} because multiple nodes have degree ≥ 2 "
                f"with redundant paths between them. "
                f"Devices found: {counts_str}.")
    elif topology == "Tree Topology":
        return (f"Detected Tree Topology because the graph is acyclic and "
                f"contains hierarchical hub/switch/router nodes. "
                f"Devices found: {counts_str}.")
    else:
        return (f"Detected {topology}. Mixed connection patterns found. "
                f"Devices found: {counts_str}.")

def generate_security_warnings(topology, nodes, G):
    warnings = []
    degs = dict(G.degree())

    # Single point of failure
    for i, nd in enumerate(nodes):
        if nd["type"] in (1, 2, 3) and degs.get(i, 0) >= len(nodes) - 1:
            warnings.append(
                f"⚠️ Single Point of Failure: {nd['name']} (node {i}) "
                f"is the central hub. If it fails, entire network goes down.")

    # No central control
    hub_count = sum(1 for nd in nodes if nd["type"] in (1, 2, 3))
    if hub_count == 0:
        warnings.append(
            "⚠️ No Central Control: No hub, switch, or router detected. "
            "Network has no management point.")

    # Disconnected nodes
    isolated = [i for i in range(len(nodes)) if degs.get(i, 0) == 0]
    if isolated:
        warnings.append(
            f"⚠️ Isolated Devices: Node(s) {isolated} have no connections.")

    # Weak topology
    if topology in ("Bus Topology", "Ring Topology"):
        warnings.append(
            f"⚠️ Weak Structure: {topology} has no redundancy. "
            f"A single cable break can disrupt the whole network.")

    if not warnings:
        warnings.append("✅ No major security issues detected.")

    return warnings