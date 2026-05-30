"""Debug ring vs mesh edge confidence"""
import sys, math
sys.path.insert(0, ".")
from app.utils import *
from ultralytics import YOLO

MODEL_PATH = "app/runs/detect/train5/weights/best.pt"
model = YOLO(MODEL_PATH)
import cv2, numpy as np

for path, label in [
    (r"D:\college_projects\ComputerVision\test\img9.webp", "Mesh"),
    (r"D:\college_projects\ComputerVision\test\img15.png", "Ring"),
]:
    print(f"\n{'='*50}\n{label} — {path}\n{'='*50}")
    orig_img = cv2.imread(path)
    h, w = orig_img.shape[:2]
    results = model.predict(path, conf=0.10, augment=False, verbose=False)
    raw_nodes = []
    for r in results:
        boxes = r.boxes.xyxy.cpu().numpy()
        classes = r.boxes.cls.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        for box, cls, conf in zip(boxes, classes, confs):
            x1, y1, x2, y2 = box
            raw_nodes.append({"type": int(cls), "name": CLASS_NAMES[int(cls)],
                "x": float((x1+x2)/2), "y": float((y1+y2)/2), "conf": float(conf),
                "box": (float(x1), float(y1), float(x2), float(y2))})
    nodes = deduplicate(raw_nodes)
    n = len(nodes)
    
    line_mask = build_line_mask(orig_img, nodes, w, h)
    hough_edges = edges_from_hough(line_mask, nodes, w, h)
    sample_edges = edges_from_sampling(line_mask, nodes, w, h)
    skel_edges, _ = edges_from_skeleton(line_mask, nodes, w, h)
    
    # Sort by angle
    cx = sum(nd["x"] for nd in nodes) / n
    cy = sum(nd["y"] for nd in nodes) / n
    angles = []
    for i, nd in enumerate(nodes):
        angle = math.atan2(nd["y"] - cy, nd["x"] - cx)
        angles.append((angle, i))
    angles.sort()
    order = [idx for _, idx in angles]
    
    ring_edges = set()
    for k in range(len(order)):
        a, b = order[k], order[(k+1) % len(order)]
        ring_edges.add((min(a,b), max(a,b)))
    
    all_edges = hough_edges | sample_edges | skel_edges
    diag_edges = all_edges - ring_edges
    
    def score(e):
        return int(e in hough_edges) + int(e in sample_edges) + int(e in skel_edges)
    
    print(f"  Ring edges: {ring_edges}")
    for e in sorted(ring_edges):
        print(f"    {e}: H={e in hough_edges} S={e in sample_edges} K={e in skel_edges} score={score(e)}")
    
    print(f"  Diagonal edges: {diag_edges}")
    for e in sorted(diag_edges):
        print(f"    {e}: H={e in hough_edges} S={e in sample_edges} K={e in skel_edges} score={score(e)}")
    
    ring_scores = [score(e) for e in ring_edges if e in all_edges]
    diag_scores = [score(e) for e in diag_edges]
    avg_ring = sum(ring_scores)/max(len(ring_scores),1)
    avg_diag = sum(diag_scores)/max(len(diag_scores),1)
    print(f"  Avg ring score: {avg_ring:.2f}, Avg diag score: {avg_diag:.2f}, diff: {avg_ring-avg_diag:.2f}")
