"""
Graph Optimizer Module

Creates an improved version of the graph WITHOUT changing topology type.
Adds only ONE missing device intelligently based on what's most needed.
"""

import networkx as nx
import math
import copy


def _distance(nodes, i, j):
    return math.hypot(nodes[i]["x"] - nodes[j]["x"],
                      nodes[i]["y"] - nodes[j]["y"])


def optimize_graph(G, nodes, topology, issues):
    """
    Optimize the graph. Key rules:
    - Add only ONE missing infrastructure device (the most needed one)
    - Intelligently pick: if star → hub/switch in center; if ring/mesh → switch
    - Fix SPOFs with backup edges (no extra devices)
    """
    opt_G = G.copy()
    opt_nodes = copy.deepcopy(nodes)
    changes = {
        "edges_added": [],
        "edges_removed": [],
        "nodes_added": [],
        "description": []
    }

    issue_list = issues.get("issues", [])
    spof_issues = [i for i in issue_list if i["type"] == "SPOF"]
    overload_issues = [i for i in issue_list if i["type"] == "OVERLOAD"]
    disconnected = [i for i in issue_list if i["type"] == "DISCONNECTED"]

    has_router = any(nd["type"] == 3 for nd in opt_nodes)
    has_switch = any(nd["type"] in (1, 2) for nd in opt_nodes)
    all_computers = all(nd["type"] == 0 for nd in opt_nodes)
    topo_lower = (topology or "").lower()

    # ── OPTIMIZATION 0: Add ONE missing infrastructure device ──
    if all_computers and len(opt_nodes) >= 3:
        # All computers, no network device → pick the BEST one for this topology
        # Star → hub in center (replace center computer conceptually, add hub)
        # Ring/Mesh/Bus → switch to manage traffic
        # Tree → switch at center
        if "star" in topo_lower:
            device_type = 1  # hub
            device_name = "hub"
        else:
            device_type = 2  # switch
            device_name = "switch"

        # Place at centroid of all nodes
        cx = sum(nd["x"] for nd in opt_nodes) / len(opt_nodes)
        cy = sum(nd["y"] for nd in opt_nodes) / len(opt_nodes)
        new_id = len(opt_nodes)
        opt_nodes.append({
            "type": device_type, "name": device_name,
            "x": cx, "y": cy,
            "conf": 1.0, "box": (cx-15, cy-15, cx+15, cy+15),
            "is_added": True
        })
        opt_G.add_node(new_id)

        # Connect to the most central existing node
        center_node = min(range(len(opt_nodes) - 1),
                         key=lambda i: math.hypot(opt_nodes[i]["x"] - cx,
                                                   opt_nodes[i]["y"] - cy))
        opt_G.add_edge(new_id, center_node)
        changes["nodes_added"].append({
            "id": new_id, "type": device_name,
            "reason": f"Network {device_name} for centralized management"
        })
        changes["description"].append(
            f"Added {device_name} #{new_id} for centralized network management."
        )
    elif not has_router and has_switch:
        # Has switch but no router → add router
        cx = sum(nd["x"] for nd in opt_nodes) / len(opt_nodes)
        min_y = min(nd["y"] for nd in opt_nodes)
        ry = min_y - 60
        new_id = len(opt_nodes)
        opt_nodes.append({
            "type": 3, "name": "router",
            "x": cx, "y": ry,
            "conf": 1.0, "box": (cx-15, ry-15, cx+15, ry+15),
            "is_added": True
        })
        opt_G.add_node(new_id)
        # Connect to first switch
        sw = next(i for i, nd in enumerate(opt_nodes[:-1]) if nd["type"] in (1, 2))
        opt_G.add_edge(new_id, sw)
        changes["nodes_added"].append({"id": new_id, "type": "router",
            "reason": "Gateway router for external connectivity"})
        changes["description"].append(
            f"Added router #{new_id} as network gateway."
        )
    elif not has_switch and has_router and len(opt_nodes) >= 4:
        # Has router but no switch → add switch
        computers = [i for i, nd in enumerate(opt_nodes) if nd["type"] == 0]
        if computers:
            cx = sum(opt_nodes[i]["x"] for i in computers) / len(computers)
            cy = sum(opt_nodes[i]["y"] for i in computers) / len(computers)
            new_id = len(opt_nodes)
            opt_nodes.append({
                "type": 2, "name": "switch",
                "x": cx, "y": cy,
                "conf": 1.0, "box": (cx-15, cy-15, cx+15, cy+15),
                "is_added": True
            })
            opt_G.add_node(new_id)
            router = next(i for i, nd in enumerate(opt_nodes[:-1]) if nd["type"] == 3)
            opt_G.add_edge(new_id, router)
            changes["nodes_added"].append({"id": new_id, "type": "switch",
                "reason": "Switch for device management"})
            changes["description"].append(
                f"Added switch #{new_id} for centralized device management."
            )

    # ── OPTIMIZATION 1: Fix disconnected components ──
    if disconnected and not nx.is_connected(opt_G):
        components = list(nx.connected_components(opt_G))
        for ci in range(1, len(components)):
            comp_a = components[0]
            comp_b = components[ci]
            best_pair, best_dist = None, float("inf")
            for a in comp_a:
                for b in comp_b:
                    d = _distance(opt_nodes, a, b)
                    if d < best_dist:
                        best_dist = d
                        best_pair = (a, b)
            if best_pair:
                opt_G.add_edge(best_pair[0], best_pair[1])
                changes["description"].append(
                    f"Connected disconnected components via #{best_pair[0]} and #{best_pair[1]}."
                )
                components[0] = components[0] | comp_b

    # ── OPTIMIZATION 2: Add backup edges for SPOFs (no extra devices) ──
    for spof in spof_issues:
        node_id = spof["node"]
        if node_id is None:
            continue
        neighbors = list(opt_G.neighbors(node_id))
        if len(neighbors) < 2:
            continue

        test_G = opt_G.copy()
        test_G.remove_node(node_id)
        sub_components = list(nx.connected_components(test_G))

        if len(sub_components) >= 2:
            a = min(sub_components[0])
            b = min(sub_components[1])
            if not opt_G.has_edge(a, b):
                opt_G.add_edge(a, b)
                changes["description"].append(
                    f"Added backup link #{a} to #{b} bypassing SPOF at "
                    f"{opt_nodes[node_id]['name']} #{node_id}."
                )

    # Summary
    if not changes["description"]:
        changes["description"].append("No optimizations needed.")

    return {
        "graph": opt_G,
        "nodes": opt_nodes,
        "changes": changes
    }
