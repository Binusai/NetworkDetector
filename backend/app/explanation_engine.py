"""
Explanation Engine Module

Generates human-readable explanations for each pipeline step
and a final comparative summary.
"""


def generate_step_explanations(
    topology, nodes, edges,
    cleanup_changes, issues, optimization_changes,
    alternative_result, scores
):
    """
    Generate explanations for each step of the analysis pipeline.

    Returns:
        dict with explanation text for each step and a final summary
    """
    n_nodes = len(nodes)
    type_counts = {}
    for nd in nodes:
        t = nd["name"]
        type_counts[t] = type_counts.get(t, 0) + 1
    counts_str = ", ".join(f"{v} {k}(s)" for k, v in type_counts.items())

    explanations = {}

    # ── DETECTION ──
    explanations["detection"] = (
        f"Detected {n_nodes} network devices: {counts_str}. "
        f"The YOLO model identified each device type with bounding boxes, "
        f"then edge detection algorithms (Hough transform, pixel sampling, "
        f"and skeletonization) mapped {len(edges)} connections between them."
    )

    # ── CLEANUP ──
    if cleanup_changes:
        removed = [c for c in cleanup_changes if c["action"] == "removed_edge"]
        added = [c for c in cleanup_changes if c["action"] == "added_edge"]
        parts = []
        if removed:
            parts.append(f"removed {len(removed)} invalid connection(s)")
        if added:
            parts.append(f"reconnected {len(added)} isolated device(s)")
        explanations["cleanup"] = (
            f"Graph cleanup {' and '.join(parts)}. "
            f"Invalid edges (like computer-to-computer or direct computer-to-router links) "
            f"were removed, and disconnected devices were reconnected to the nearest switch or hub."
        )
    else:
        explanations["cleanup"] = (
            "No graph corrections were needed. All detected connections follow "
            "valid network hierarchy rules."
        )

    # ── ISSUES ──
    issue_list = issues.get("issues", [])
    if issue_list:
        issue_types = {}
        for i in issue_list:
            t = i["type"]
            issue_types[t] = issue_types.get(t, 0) + 1

        issue_parts = []
        if "SPOF" in issue_types:
            issue_parts.append(f"{issue_types['SPOF']} single point(s) of failure")
        if "OVERLOAD" in issue_types:
            issue_parts.append(f"{issue_types['OVERLOAD']} overloaded device(s)")
        if "DISCONNECTED" in issue_types:
            issue_parts.append("disconnected network segments")
        if "NO_REDUNDANCY" in issue_types:
            issue_parts.append("lack of backup paths")
        if "NO_GATEWAY" in issue_types:
            issue_parts.append("no router/gateway detected")

        explanations["issues"] = (
            f"Issue analysis found: {', '.join(issue_parts)}. "
            f"{issues.get('summary', '')}"
        )
    else:
        explanations["issues"] = (
            "No significant network issues were detected. "
            "The network structure is healthy and well-connected."
        )

    # ── OPTIMIZATION ──
    opt_changes = optimization_changes.get("changes", {})
    opt_edges_added = opt_changes.get("edges_added", [])
    opt_edges_removed = opt_changes.get("edges_removed", [])
    opt_nodes_added = opt_changes.get("nodes_added", [])
    opt_desc = opt_changes.get("description", [])

    if opt_edges_added or opt_nodes_added:
        explanations["optimization"] = (
            f"Optimized the {topology} by adding {len(opt_nodes_added)} device(s) "
            f"and {len(opt_edges_added)} connection(s)"
            + (f", removing {len(opt_edges_removed)} connection(s)" if opt_edges_removed else "")
            + ". " + " ".join(opt_desc)
        )
    else:
        explanations["optimization"] = (
            f"No optimizations were needed. The {topology} is already "
            f"well-structured and balanced."
        )

    # ── ALTERNATIVE TOPOLOGY ──
    if alternative_result.get("suggested"):
        alt_topo = alternative_result["alternative_topology"]
        explanations["alternative"] = (
            f"A {alt_topo} is recommended as a better alternative. "
            f"{alternative_result.get('reason', '')}"
        )
    else:
        explanations["alternative"] = (
            f"No better topology is recommended. "
            f"{alternative_result.get('reason', 'The current structure is optimal.')}"
        )

    # ── FINAL SUMMARY ──
    orig_scores = scores.get("original", {})
    opt_scores = scores.get("optimized", {})
    alt_scores = scores.get("alternative", {})

    summary_parts = [
        f"The detected {topology} with {n_nodes} devices was analyzed through "
        f"a 5-step pipeline: detection → cleanup → issue analysis → optimization → scoring."
    ]

    if orig_scores and opt_scores:
        orig_overall = orig_scores.get("overall", 0)
        opt_overall = opt_scores.get("overall", 0)
        improvement = opt_overall - orig_overall
        if improvement > 0:
            summary_parts.append(
                f"After optimization, the overall score improved from "
                f"{orig_overall} to {opt_overall} (+{improvement} points)."
            )
        else:
            summary_parts.append(
                f"The graph scored {orig_overall}/100 overall. "
                f"No significant improvement was possible within the same topology."
            )

    if alt_scores and alternative_result.get("suggested"):
        alt_overall = alt_scores.get("overall", 0)
        summary_parts.append(
            f"An alternative {alternative_result['alternative_topology']} "
            f"would score {alt_overall}/100."
        )

    explanations["summary"] = " ".join(summary_parts)

    return explanations


def generate_security_analysis(topology, nodes, G, issues):
    """
    Generate detailed, topology-specific security analysis.
    Replaces the old AI-based approach with comprehensive deterministic analysis.

    Returns:
        dict with score, summary, and detailed insights
    """
    degs = dict(G.degree())
    n = len(nodes)
    type_counts = {}
    for nd in nodes:
        t = nd["name"]
        type_counts[t] = type_counts.get(t, 0) + 1

    insights = []
    score = 70  # base

    # ── TOPOLOGY-SPECIFIC ANALYSIS ──
    if "Star" in topology:
        # Find center node
        center = max(degs, key=degs.get) if degs else None
        if center is not None:
            insights.append({
                "level": "critical",
                "title": "Central Node Dependency",
                "description": (
                    f"The {nodes[center]['name']} #{center} is the central hub with "
                    f"{degs[center]} connections. All traffic flows through this single device. "
                    f"If it fails, the entire network goes offline."
                ),
                "recommendation": (
                    "Deploy a redundant standby switch/hub configured for automatic failover. "
                    "Consider upgrading to a tree topology to distribute the load."
                )
            })
            score -= 20

    elif "Bus" in topology:
        insights.append({
            "level": "critical",
            "title": "Single Backbone Vulnerability",
            "description": (
                "Bus topology uses a shared backbone cable. A break at any point "
                "disrupts communication for all downstream devices. There is no "
                "path redundancy in this design."
            ),
            "recommendation": (
                "Migrate to a star or tree topology where each device has a dedicated "
                "connection. This isolates faults and improves reliability."
            )
        })
        score -= 25

    elif "Ring" in topology:
        insights.append({
            "level": "warning",
            "title": "Ring Break Vulnerability",
            "description": (
                "In a ring topology, data travels in a circular path. A single "
                "link failure breaks the entire ring and halts communication "
                "between all nodes."
            ),
            "recommendation": (
                "Implement a dual-ring (counter-rotating) design for automatic "
                "recovery, or switch to a star/tree topology for better fault isolation."
            )
        })
        score -= 15

    elif "Mesh" in topology:
        if "Full" in topology:
            insights.append({
                "level": "good",
                "title": "Maximum Redundancy",
                "description": (
                    f"Full mesh provides {G.number_of_edges()} connections across "
                    f"{n} devices. Every node has a direct path to every other node, "
                    f"offering the highest possible fault tolerance."
                ),
                "recommendation": (
                    "While highly reliable, consider the cost of maintaining all connections. "
                    "A partial mesh may offer similar reliability at lower cost."
                )
            })
            score += 10
        else:
            insights.append({
                "level": "good",
                "title": "Good Redundancy",
                "description": (
                    "Partial mesh provides multiple paths between devices, offering "
                    "good fault tolerance without the cost of a full mesh."
                ),
                "recommendation": (
                    "Ensure critical devices have at least two independent paths "
                    "for maximum reliability."
                )
            })
            score += 5

    elif "Tree" in topology:
        insights.append({
            "level": "info",
            "title": "Hierarchical Structure",
            "description": (
                "Tree topology provides clear hierarchy and efficient routing. "
                "However, parent node failures can disconnect entire branches."
            ),
            "recommendation": (
                "Add redundant links between branches for fault tolerance. "
                "Monitor root-level devices closely as they are critical."
            )
        })

    # ── GENERAL CHECKS ──

    # SPOF check from issues
    spof_issues = [i for i in issues.get("issues", []) if i["type"] == "SPOF"]
    for spof in spof_issues:
        nd_id = spof["node"]
        if nd_id is not None:
            insights.append({
                "level": "warning",
                "title": f"SPOF: {nodes[nd_id]['name'].capitalize()} #{nd_id}",
                "description": spof["description"],
                "recommendation": (
                    f"Add a backup path that bypasses {nodes[nd_id]['name']} #{nd_id}. "
                    f"Consider deploying a redundant device."
                )
            })
            score -= 5

    # No router = no gateway
    if not any(nd["type"] == 3 for nd in nodes):
        insights.append({
            "level": "info",
            "title": "No External Gateway",
            "description": (
                "No router was detected. This network cannot connect to external "
                "networks or the internet without a gateway device."
            ),
            "recommendation": (
                "Add a router at the network's edge to enable inter-network "
                "communication and apply firewall policies."
            )
        })
        score -= 5

    # Hub vs Switch security
    hub_count = type_counts.get("hub", 0)
    if hub_count > 0:
        insights.append({
            "level": "warning",
            "title": "Hub Broadcasting Risk",
            "description": (
                f"{hub_count} hub(s) detected. Hubs broadcast all traffic to every port, "
                f"making the network vulnerable to packet sniffing and increasing collision domains."
            ),
            "recommendation": (
                "Replace hubs with managed switches for traffic isolation, "
                "VLAN support, and better security."
            )
        })
        score -= 8

    # Good: all devices connected
    if n > 0 and all(degs.get(i, 0) > 0 for i in range(n)):
        insights.append({
            "level": "good",
            "title": "Full Device Connectivity",
            "description": (
                f"All {n} devices are connected to the network with no isolated nodes."
            ),
            "recommendation": "Maintain regular connectivity monitoring to detect failures early."
        })
        score += 5

    score = max(0, min(100, score))

    summary = (
        f"{topology} with {n} devices. "
        + ("Network is well-secured. " if score >= 75 else
           "Several vulnerabilities need attention. " if score >= 50 else
           "Critical security concerns detected. ")
    )

    return {
        "score": score,
        "summary": summary,
        "insights": insights
    }
