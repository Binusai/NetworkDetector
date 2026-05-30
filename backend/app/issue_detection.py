"""
Issue Detection Module

Detects key network issues: SPOF, overloaded devices,
disconnected components, and lack of redundancy.
"""

import networkx as nx

# Degree thresholds for overload detection
OVERLOAD_THRESHOLDS = {
    0: 1,   # computer
    1: 6,   # hub
    2: 8,   # switch
    3: 4,   # router
}


def detect_issues(G, nodes):
    """
    Detect network issues in the graph.

    Args:
        G: NetworkX graph
        nodes: list of node dicts

    Returns:
        dict with "issues" list and "summary"
    """
    issues = []
    n = len(nodes)

    if n == 0 or G.number_of_edges() == 0:
        issues.append({
            "type": "NO_NETWORK",
            "severity": "critical",
            "node": None,
            "description": "No network structure detected. The graph has no connections."
        })
        return {"issues": issues, "summary": "No network detected."}

    # 1. Disconnected Components
    if not nx.is_connected(G):
        components = list(nx.connected_components(G))
        issues.append({
            "type": "DISCONNECTED",
            "severity": "critical",
            "node": None,
            "description": f"Network has {len(components)} disconnected components. "
                           f"Not all devices can communicate with each other.",
            "components": [list(c) for c in components]
        })

    # 2. Single Point of Failure (SPOF)
    # Articulation points = nodes whose removal disconnects the graph
    if nx.is_connected(G):
        art_points = list(nx.articulation_points(G))
        for ap in art_points:
            nd = nodes[ap]
            # Only flag intermediary devices as SPOF (not endpoints)
            if nd["type"] in (1, 2, 3):
                issues.append({
                    "type": "SPOF",
                    "severity": "warning",
                    "node": ap,
                    "description": f"{nd['name'].capitalize()} #{ap} is a single point of failure. "
                                   f"If this device goes down, parts of the network will be disconnected."
                })

    # 3. Overloaded Devices
    for i in range(n):
        nd = nodes[i]
        deg = G.degree(i)
        threshold = OVERLOAD_THRESHOLDS.get(nd["type"], 6)
        if deg > threshold:
            issues.append({
                "type": "OVERLOAD",
                "severity": "warning",
                "node": i,
                "description": f"{nd['name'].capitalize()} #{i} has {deg} connections "
                               f"(threshold: {threshold}). This device may be overloaded."
            })

    # 4. No Redundancy
    if nx.is_connected(G) and n > 2:
        # Check if removing any edge disconnects the graph (bridge edges)
        bridges = list(nx.bridges(G))
        if len(bridges) > 0:
            bridge_pct = len(bridges) / G.number_of_edges() * 100
            if bridge_pct > 50:
                issues.append({
                    "type": "NO_REDUNDANCY",
                    "severity": "warning",
                    "node": None,
                    "description": f"{len(bridges)} of {G.number_of_edges()} connections are bridge links "
                                   f"({bridge_pct:.0f}%). Breaking any of these disconnects the network. "
                                   f"Consider adding backup paths."
                })

    # 5. Isolated endpoints (degree 0) — should be caught by cleanup, but check anyway
    isolated = [i for i in range(n) if G.degree(i) == 0]
    if isolated:
        names = [f"{nodes[i]['name']} #{i}" for i in isolated]
        issues.append({
            "type": "ISOLATED",
            "severity": "critical",
            "node": isolated[0],
            "description": f"{len(isolated)} device(s) have no connections: {', '.join(names)}."
        })

    # 6. Hub without router (no gateway)
    has_router = any(nd["type"] == 3 for nd in nodes)
    if not has_router:
        issues.append({
            "type": "NO_GATEWAY",
            "severity": "info",
            "node": None,
            "description": "No router detected. The network has no gateway to external networks."
        })

    # 7. No switch/hub (no centralized management)
    has_switch = any(nd["type"] in (1, 2) for nd in nodes)
    computer_count = sum(1 for nd in nodes if nd["type"] == 0)
    if not has_switch and computer_count >= 3:
        issues.append({
            "type": "NO_SWITCH",
            "severity": "info",
            "node": None,
            "description": "No switch or hub detected. The network lacks centralized device management."
        })

    # Build summary
    critical_count = sum(1 for i in issues if i["severity"] == "critical")
    warning_count = sum(1 for i in issues if i["severity"] == "warning")

    if not issues:
        summary = "No significant network issues detected. The network structure looks healthy."
    elif critical_count > 0:
        summary = f"Found {critical_count} critical and {warning_count} warning issue(s). Immediate attention recommended."
    else:
        summary = f"Found {warning_count} warning issue(s). Network is functional but could be improved."

    return {"issues": issues, "summary": summary}
