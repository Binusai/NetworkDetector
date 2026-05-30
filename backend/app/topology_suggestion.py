"""
Topology Suggestion Module

Suggests a better topology based on the detected one.
Builds a complete alternative graph with proper edges.

Rules:
  STAR → TREE (remove SPOF)
  BUS → STAR (better performance)
  RING → TREE (more flexible)
  MESH → TREE (reduce cost)
  TREE → no change
  HYBRID → TREE (cleaner structure)
"""

import networkx as nx
import copy


TOPOLOGY_SUGGESTIONS = {
    "Star Topology": {
        "suggest": "Tree Topology",
        "reason": "Star topology has a single point of failure at the central device. "
                  "A tree topology distributes the load across multiple levels, "
                  "removing the SPOF and improving fault tolerance.",
        "should_suggest": True
    },
    "Bus Topology": {
        "suggest": "Star Topology",
        "reason": "Bus topology relies on a single backbone cable — any break disrupts "
                  "the entire network. A star topology provides better performance with "
                  "dedicated links and isolates failures to individual connections.",
        "should_suggest": True
    },
    "Ring Topology": {
        "suggest": "Tree Topology",
        "reason": "Ring topology requires all links to be active — a single break "
                  "disrupts the loop. A tree topology is more flexible, easier to "
                  "expand, and provides better fault isolation.",
        "should_suggest": True
    },
    "Mesh Topology (Full)": {
        "suggest": "Tree Topology",
        "reason": "Full mesh has O(n²) connections which is expensive and complex. "
                  "A tree topology reduces cost significantly while maintaining "
                  "good connectivity through hierarchical routing.",
        "should_suggest": True
    },
    "Mesh Topology (Partial)": {
        "suggest": "Tree Topology",
        "reason": "Partial mesh has redundant connections that increase cost. "
                  "A tree topology achieves good connectivity with fewer links, "
                  "reducing cost and simplifying management.",
        "should_suggest": True
    },
    "Tree Topology": {
        "suggest": None,
        "reason": "Tree topology is already optimal — hierarchical, scalable, and efficient. "
                  "Only redundancy improvements are needed, which are handled in the optimization step.",
        "should_suggest": False
    },
    "Hybrid Topology": {
        "suggest": "Tree Topology",
        "reason": "The current hybrid structure is irregular. A clean tree topology "
                  "would provide better organization, easier management, and clearer "
                  "hierarchy for traffic flow.",
        "should_suggest": True
    },
}


def _build_tree_graph(nodes):
    """
    Build a proper tree topology from the given nodes.
    Hierarchy: router at root → switches in middle → computers as leaves.
    All edges are explicitly created.
    """
    G = nx.Graph()
    new_nodes = copy.deepcopy(nodes)
    added_nodes = []

    routers = [i for i, n in enumerate(nodes) if n["type"] == 3]
    switches = [i for i, n in enumerate(nodes) if n["type"] in (1, 2)]
    computers = [i for i, n in enumerate(nodes) if n["type"] == 0]

    # Add all existing nodes
    for i in range(len(nodes)):
        G.add_node(i)

    # If no switches exist, add one
    if not switches and computers:
        cx = sum(nodes[i]["x"] for i in computers) / len(computers)
        cy = sum(nodes[i]["y"] for i in computers) / len(computers)
        new_id = len(new_nodes)
        new_nodes.append({
            "type": 2, "name": "switch",
            "x": cx, "y": cy,
            "conf": 1.0, "box": (cx-15, cy-15, cx+15, cy+15),
            "is_added": True
        })
        G.add_node(new_id)
        switches.append(new_id)
        added_nodes.append({"id": new_id, "type": "switch", "reason": "Central switch for tree"})

    # If no routers exist, add one at the top
    if not routers:
        cx = sum(n["x"] for n in new_nodes) / max(len(new_nodes), 1)
        min_y = min(n["y"] for n in new_nodes)
        ry = min_y - 60
        new_id = len(new_nodes)
        new_nodes.append({
            "type": 3, "name": "router",
            "x": cx, "y": ry,
            "conf": 1.0, "box": (cx-15, ry-15, cx+15, ry+15),
            "is_added": True
        })
        G.add_node(new_id)
        routers.append(new_id)
        added_nodes.append({"id": new_id, "type": "router", "reason": "Root router for tree"})

    # ── Build tree edges ──
    root_router = routers[0]

    # Router → all switches
    for sw in switches:
        G.add_edge(root_router, sw)

    # Multiple routers: chain them
    for i in range(1, len(routers)):
        G.add_edge(routers[i - 1], routers[i])

    # Distribute computers evenly across switches
    if switches:
        for ci, comp in enumerate(computers):
            sw_idx = ci % len(switches)
            G.add_edge(switches[sw_idx], comp)

    # Connect any remaining routers (non-root) to root
    for r in routers[1:]:
        if not G.has_edge(root_router, r):
            G.add_edge(root_router, r)

    return G, new_nodes, added_nodes


def _build_star_graph(nodes):
    """Build a star topology with a central switch."""
    G = nx.Graph()
    new_nodes = copy.deepcopy(nodes)
    added_nodes = []

    switches = [i for i, n in enumerate(nodes) if n["type"] in (1, 2)]

    for i in range(len(nodes)):
        G.add_node(i)

    # Use existing switch as center, or add one
    if switches:
        center = switches[0]
    else:
        cx = sum(n["x"] for n in nodes) / max(len(nodes), 1)
        cy = sum(n["y"] for n in nodes) / max(len(nodes), 1)
        center = len(new_nodes)
        new_nodes.append({
            "type": 2, "name": "switch",
            "x": cx, "y": cy,
            "conf": 1.0, "box": (cx-15, cy-15, cx+15, cy+15),
            "is_added": True
        })
        G.add_node(center)
        added_nodes.append({"id": center, "type": "switch", "reason": "Central switch for star"})

    # Connect ALL other nodes to center
    for i in range(len(new_nodes)):
        if i != center:
            G.add_edge(center, i)

    return G, new_nodes, added_nodes


def suggest_topology(G, nodes, topology, original_scores):
    """
    Analyze whether a better topology exists and build it.
    """
    config = TOPOLOGY_SUGGESTIONS.get(topology, {
        "suggest": None,
        "reason": "Unable to evaluate this topology type.",
        "should_suggest": False
    })

    if not config["should_suggest"] or config["suggest"] is None:
        return {
            "suggested": False,
            "current_topology": topology,
            "reason": config["reason"],
            "alternative_topology": None,
            "graph": None,
            "nodes": None,
            "added_nodes": []
        }

    # Build the suggested topology
    target = config["suggest"]
    if target == "Tree Topology":
        alt_G, alt_nodes, added = _build_tree_graph(nodes)
    elif target == "Star Topology":
        alt_G, alt_nodes, added = _build_star_graph(nodes)
    else:
        alt_G, alt_nodes, added = _build_tree_graph(nodes)

    return {
        "suggested": True,
        "current_topology": topology,
        "alternative_topology": target,
        "reason": config["reason"],
        "graph": alt_G,
        "nodes": alt_nodes,
        "added_nodes": added
    }
