"""
Graph Cleanup & Error Correction Module

Takes raw detected graph → returns corrected graph.
Removes invalid edges, enforces hierarchy, fixes disconnected nodes,
and limits unrealistic node degree.
"""

import networkx as nx
import math

CLASS_NAMES = {0: "computer", 1: "hub", 2: "switch", 3: "router"}

# Device type sets
COMPUTERS = {0}        # computer
INTERMEDIARIES = {1, 2}  # hub, switch
ROUTERS = {3}          # router

# Degree limits
MAX_DEGREE = {
    0: 1,   # computer: max 1 connection
    1: 8,   # hub: max 8
    2: 12,  # switch: max 12
    3: 6,   # router: max 6
}


def _node_type(nodes, i):
    """Get node type id."""
    return nodes[i]["type"]


def _node_name(nodes, i):
    """Get node type name."""
    return nodes[i]["name"]


def _distance(nodes, i, j):
    """Euclidean distance between two nodes."""
    return math.hypot(nodes[i]["x"] - nodes[j]["x"],
                      nodes[i]["y"] - nodes[j]["y"])


def _is_valid_edge(nodes, i, j):
    """
    Check if an edge is valid according to network hierarchy rules.
    
    Valid connections:
      - computer ↔ switch/hub
      - switch/hub ↔ router
      - switch/hub ↔ switch/hub
    
    Invalid connections:
      - computer ↔ computer
      - computer ↔ router (direct, must go through switch/hub)
    """
    ti = _node_type(nodes, i)
    tj = _node_type(nodes, j)

    # computer ↔ computer: INVALID
    if ti in COMPUTERS and tj in COMPUTERS:
        return False

    # computer ↔ router (direct): INVALID
    if (ti in COMPUTERS and tj in ROUTERS) or (ti in ROUTERS and tj in COMPUTERS):
        return False

    return True


def _find_nearest_intermediary(nodes, node_idx, G):
    """Find the nearest switch/hub to connect a disconnected node to."""
    best_j, best_d = None, float("inf")
    for j in range(len(nodes)):
        if j == node_idx:
            continue
        if _node_type(nodes, j) in INTERMEDIARIES:
            d = _distance(nodes, node_idx, j)
            if d < best_d:
                best_d = d
                best_j = j
    return best_j


def _find_nearest_valid(nodes, node_idx, G):
    """Find the nearest valid device to connect to."""
    ti = _node_type(nodes, node_idx)
    best_j, best_d = None, float("inf")

    for j in range(len(nodes)):
        if j == node_idx:
            continue
        if _is_valid_edge(nodes, node_idx, j):
            d = _distance(nodes, node_idx, j)
            if d < best_d:
                best_d = d
                best_j = j
    return best_j


def clean_graph(G, nodes):
    """
    Clean the detected graph by removing invalid edges and enforcing
    network hierarchy rules.

    When the network has no intermediary devices (switches/hubs/routers),
    computer↔computer edges are valid (peer-to-peer / ring / mesh topology).

    Args:
        G: NetworkX graph (raw detected)
        nodes: list of node dicts with 'type', 'name', 'x', 'y', etc.

    Returns:
        (cleaned_G, changes_log): cleaned graph and list of changes made
    """
    cleaned = G.copy()
    changes = []

    # Check if network has ANY intermediary devices
    has_intermediaries = any(
        _node_type(nodes, i) in INTERMEDIARIES or _node_type(nodes, i) in ROUTERS
        for i in range(len(nodes))
    )

    # STEP 1: Remove invalid edges (only when intermediaries exist)
    if has_intermediaries:
        edges_to_remove = []
        for i, j in list(cleaned.edges()):
            if not _is_valid_edge(nodes, i, j):
                edges_to_remove.append((i, j))

        for i, j in edges_to_remove:
            cleaned.remove_edge(i, j)
            ni = _node_name(nodes, i)
            nj = _node_name(nodes, j)
            changes.append({
                "action": "removed_edge",
                "edge": [i, j],
                "reason": f"Invalid connection: {ni} #{i} ↔ {nj} #{j} (violates hierarchy)"
            })

    # STEP 2: Limit unrealistic node degree
    # When no intermediaries, relax computer degree limit (peer-to-peer networks)
    for i in range(len(nodes)):
        ti = _node_type(nodes, i)
        if has_intermediaries:
            max_deg = MAX_DEGREE.get(ti, 8)
        else:
            # Peer-to-peer: computers can have up to n-1 connections (full mesh)
            max_deg = max(len(nodes) - 1, MAX_DEGREE.get(ti, 8))

        while cleaned.degree(i) > max_deg:
            # Remove the weakest (longest distance) edge
            neighbors = list(cleaned.neighbors(i))
            farthest = max(neighbors, key=lambda j: _distance(nodes, i, j))
            cleaned.remove_edge(i, farthest)
            changes.append({
                "action": "removed_edge",
                "edge": [i, farthest],
                "reason": f"Overloaded: {_node_name(nodes, i)} #{i} exceeded max {max_deg} connections"
            })

    # STEP 3: Fix disconnected nodes - connect to nearest valid device
    for i in range(len(nodes)):
        if cleaned.degree(i) == 0:
            if has_intermediaries:
                # Try to find nearest intermediary first
                target = _find_nearest_intermediary(nodes, i, cleaned)
                if target is None:
                    target = _find_nearest_valid(nodes, i, cleaned)
            else:
                # Peer-to-peer: connect to nearest node
                best_j, best_d = None, float("inf")
                for j in range(len(nodes)):
                    if j == i:
                        continue
                    d = _distance(nodes, i, j)
                    if d < best_d:
                        best_d = d
                        best_j = j
                target = best_j

            if target is not None:
                cleaned.add_edge(i, target)
                changes.append({
                    "action": "added_edge",
                    "edge": [i, target],
                    "reason": f"Reconnected isolated {_node_name(nodes, i)} #{i} to {_node_name(nodes, target)} #{target}"
                })

    return cleaned, changes
