import requests, time, os, sys
sys.stdout.reconfigure(encoding='utf-8')

images = [
    (r"D:\college_projects\ComputerVision\test\img1.png", "Hybrid"),
    (r"D:\college_projects\ComputerVision\test\img9.webp", "Mesh"),
    (r"D:\college_projects\ComputerVision\test\img15.png", "Ring"),
    (r"D:\college_projects\ComputerVision\test\img31.png", "Star"),
    (r"D:\college_projects\ComputerVision\test\tree1.jpg", "Tree"),
]

for path, label in images:
    name = os.path.basename(path)
    with open(path, "rb") as f:
        r = requests.post("http://localhost:8000/predict", files={"file": (name, f)}, timeout=120)
    if r.status_code == 200:
        d = r.json()
        topo = d.get("topology", "?")
        nodes_n = len(d.get("nodes", []))
        edges_n = len(d.get("edges", []))
        
        # Scores
        sc = d.get("scores", {})
        orig = sc.get("original", {})
        opt = sc.get("optimized", {})
        alt_s = sc.get("alternative", {})
        
        # Optimization
        optim = d.get("optimization", {})
        opt_nodes_n = len(optim.get("nodes", []))
        opt_edges_n = len(optim.get("edges", []))
        opt_changes = optim.get("changes", {}).get("description", [])
        
        # Alternative
        alt = d.get("alternative", {})
        alt_topo = alt.get("alternative_topology", "none")
        alt_suggested = alt.get("suggested", False)
        alt_nodes_n = len(alt.get("nodes", []))
        alt_edges_n = len(alt.get("edges", []))
        
        print(f"\n{'='*60}")
        print(f"{name:15s} | Expected: {label} | Detected: {topo}")
        print(f"  Nodes: {nodes_n} | Edges: {edges_n}")
        print(f"  SCORES:")
        print(f"    Original:    R={orig.get('reliability'):3d} E={orig.get('efficiency'):3d} C={orig.get('connectivity'):3d} O={orig.get('overall'):3d}")
        print(f"    Optimized:   R={opt.get('reliability'):3d} E={opt.get('efficiency'):3d} C={opt.get('connectivity'):3d} O={opt.get('overall'):3d}")
        if alt_s:
            print(f"    Alternative: R={alt_s.get('reliability'):3d} E={alt_s.get('efficiency'):3d} C={alt_s.get('connectivity'):3d} O={alt_s.get('overall'):3d}")
            correct = alt_s.get('overall',0) >= opt.get('overall',0) >= orig.get('overall',0)
            print(f"    Score order correct (alt>=opt>=orig): {correct}")
        else:
            print(f"    Alternative: N/A")
        print(f"  OPTIMIZED: {opt_nodes_n}N {opt_edges_n}E")
        for c in opt_changes[:3]:
            print(f"    - {c}")
        print(f"  ALTERNATIVE: suggested={alt_suggested} -> {alt_topo} ({alt_nodes_n}N {alt_edges_n}E)")
    else:
        print(f"{name}: ERROR {r.status_code}")
