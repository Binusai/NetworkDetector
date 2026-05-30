import requests
import json
import time
import os

test_images = [
    r'D:\college_projects\ComputerVision\test\img1.png',
    r'D:\college_projects\ComputerVision\test\img15.png',
    r'D:\college_projects\ComputerVision\test\img31.png',
    r'D:\college_projects\ComputerVision\test\img9.webp',
    r'D:\college_projects\ComputerVision\test\tree1.jpg',
]

results_summary = []

for img_path in test_images:
    img_name = os.path.basename(img_path)
    print(f"\n{'='*50}")
    print(f"Testing: {img_name}")
    print('='*50)

    start = time.time()
    try:
        with open(img_path, 'rb') as f:
            r = requests.post('http://localhost:8000/predict', files={'file': (img_name, f)}, timeout=120)
        elapsed = time.time() - start

        if r.status_code == 200:
            data = r.json()
            topology = data.get("topology", "N/A")
            nodes = data.get("nodes", [])
            edges = data.get("edges", [])
            issues = data.get("issues", {}).get("issues", [])
            scores_orig = data.get("scores", {}).get("original", {})
            scores_opt = data.get("scores", {}).get("optimized", {})
            alt = data.get("alternative", {})
            sec = data.get("security", {})
            cleanup = data.get("cleanup", {})
            opt = data.get("optimization", {})
            expl = data.get("explanations", {})

            print(f"  Time:         {elapsed:.1f}s")
            print(f"  Topology:     {topology}")
            print(f"  Nodes:        {len(nodes)}")
            print(f"  Edges:        {len(edges)}")
            print(f"  Issues:       {len(issues)}")
            print(f"  Cleanup:      {cleanup.get('summary', 'N/A')}")

            print(f"  Scores (orig): reliability={scores_orig.get('reliability')}, "
                  f"efficiency={scores_orig.get('efficiency')}, "
                  f"connectivity={scores_orig.get('connectivity')}, "
                  f"overall={scores_orig.get('overall')}")

            print(f"  Scores (opt):  reliability={scores_opt.get('reliability')}, "
                  f"efficiency={scores_opt.get('efficiency')}, "
                  f"connectivity={scores_opt.get('connectivity')}, "
                  f"overall={scores_opt.get('overall')}")

            alt_suggested = alt.get("suggested", False)
            alt_topo = alt.get("alternative_topology", "N/A")
            print(f"  Alternative:  suggested={alt_suggested}, topology={alt_topo}")

            sec_warnings = sec.get("warnings", [])
            print(f"  Security:     {len(sec_warnings)} warnings")

            opt_nodes = opt.get("nodes", [])
            opt_edges = opt.get("edges", [])
            opt_changes = opt.get("changes", {})
            print(f"  Opt nodes:    {len(opt_nodes)}, edges: {len(opt_edges)}")
            print(f"  Opt changes:  {opt_changes}")

            expl_keys = list(expl.keys()) if expl else []
            print(f"  Expl keys:    {expl_keys}")

            # Print issue details
            if issues:
                print(f"  Issue list:")
                for iss in issues[:3]:
                    print(f"    - [{iss.get('type')}] {iss.get('description', '')[:80]}")

            # Print first security warning
            if sec_warnings:
                print(f"  First warning: {sec_warnings[0].get('title', 'N/A')}")

            results_summary.append({
                "image": img_name,
                "time": round(elapsed, 1),
                "topology": topology,
                "nodes": len(nodes),
                "edges": len(edges),
                "issues": len(issues),
                "orig_overall": scores_orig.get("overall"),
                "opt_overall": scores_opt.get("overall"),
                "alt_suggested": alt_suggested,
                "sec_warnings": len(sec_warnings),
                "status": "OK"
            })
        else:
            print(f"  ERROR {r.status_code}: {r.text[:400]}")
            results_summary.append({"image": img_name, "status": "ERROR", "code": r.status_code, "detail": r.text[:200]})

    except Exception as e:
        elapsed = time.time() - start
        print(f"  EXCEPTION after {elapsed:.1f}s: {e}")
        results_summary.append({"image": img_name, "status": "EXCEPTION", "error": str(e)})

print(f"\n{'='*50}")
print("SUMMARY")
print('='*50)
for r in results_summary:
    if r["status"] == "OK":
        print(f"  {r['image']:15s} | {r['topology']:12s} | {r['time']}s | nodes={r['nodes']} edges={r['edges']} | overall: {r['orig_overall']}->{r['opt_overall']} | alt={r['alt_suggested']} | sec={r['sec_warnings']} warnings")
    else:
        print(f"  {r['image']:15s} | {r['status']} | {r.get('detail', r.get('error', ''))[:80]}")

# Save full JSON of last successful result for inspection
print("\n[Saving last result to test_last_result.json]")
