"""Debug edge detection to understand why ring and mesh images fail."""
import cv2
import numpy as np
import sys
import os
sys.path.insert(0, ".")
from app.utils import (
    deduplicate, box_center, build_line_mask,
    edges_from_hough, edges_from_sampling, edges_from_skeleton,
    filter_obstructed_edges, filter_low_confidence_cycles,
    CLASS_NAMES
)
from ultralytics import YOLO

MODEL_PATH = "app/runs/detect/train5/weights/best.pt"
model = YOLO(MODEL_PATH)

images = [
    (r"D:\college_projects\ComputerVision\test\img9.webp", "Mesh"),
    (r"D:\college_projects\ComputerVision\test\img15.png", "Ring"),
    (r"D:\college_projects\ComputerVision\test\img31.png", "Other"),
]

for path, label in images:
    name = os.path.basename(path)
    print(f"\n{'='*60}")
    print(f"DEBUG: {label} — {name}")
    print("="*60)

    orig_img = cv2.imread(path)
    if orig_img is None:
        print("  Could not read image!")
        continue

    h, w = orig_img.shape[:2]
    MAX_DIM = 1000
    scale = 1.0
    if max(h, w) > MAX_DIM:
        scale = MAX_DIM / max(h, w)
        orig_img = cv2.resize(orig_img, (int(w * scale), int(h * scale)))
        h, w = orig_img.shape[:2]

    print(f"  Image size: {w}x{h}, scale={scale:.2f}")

    # Detect nodes
    results = model.predict(path, conf=0.10, augment=False, verbose=False)
    raw_nodes = []
    for r in results:
        boxes = r.boxes.xyxy.cpu().numpy()
        classes = r.boxes.cls.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        for box, cls, conf in zip(boxes, classes, confs):
            x1, y1, x2, y2 = box * scale
            raw_nodes.append({
                "type": int(cls), "name": CLASS_NAMES[int(cls)],
                "x": float((x1+x2)/2), "y": float((y1+y2)/2),
                "conf": float(conf),
                "box": (float(x1), float(y1), float(x2), float(y2))
            })
    nodes = deduplicate(raw_nodes)
    print(f"  Nodes detected: {len(nodes)}")
    for i, n in enumerate(nodes):
        print(f"    [{i}] {n['name']} at ({n['x']:.0f},{n['y']:.0f}) conf={n['conf']:.2f}")

    # Build line mask
    gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    mean_val = np.mean(gray)
    print(f"  Gray mean: {mean_val:.1f}")

    line_mask = build_line_mask(orig_img, nodes, w, h)
    mask_pixels = np.sum(line_mask > 0)
    total_pixels = w * h
    print(f"  Line mask: {mask_pixels} pixels ({100*mask_pixels/total_pixels:.1f}% of image)")

    # Edge detection stages
    hough_edges = edges_from_hough(line_mask, nodes, w, h)
    print(f"  Hough edges: {len(hough_edges)} -> {hough_edges}")

    sample_edges = edges_from_sampling(line_mask, nodes, w, h)
    print(f"  Sampling edges: {len(sample_edges)} -> {sample_edges}")

    skel_edges, _ = edges_from_skeleton(line_mask, nodes, w, h)
    print(f"  Skeleton edges: {len(skel_edges)} -> {skel_edges}")

    raw_edge_set = hough_edges | sample_edges | skel_edges
    print(f"  Union (raw): {len(raw_edge_set)} -> {raw_edge_set}")

    filtered = filter_obstructed_edges(raw_edge_set, nodes)
    print(f"  After obstruction filter: {len(filtered)} -> {filtered}")
    removed_by_obstruction = raw_edge_set - filtered
    if removed_by_obstruction:
        print(f"  *** REMOVED by obstruction: {removed_by_obstruction}")

    final = filter_low_confidence_cycles(filtered, hough_edges, sample_edges, skel_edges, nodes)
    print(f"  After cycle filter: {len(final)} -> {final}")
