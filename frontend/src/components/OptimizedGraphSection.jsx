import { useState, useEffect } from "react"

const TYPE_COLORS = {
  computer: "#47c8ff", hub: "#69e08a", switch: "#ffb84d", router: "#ff6b6b"
}

export default function OptimizedGraphSection({ originalNodes, originalEdges, optimization, topology }) {
  const [phase, setPhase] = useState("hidden")

  const optNodes = optimization?.nodes || []
  const optEdges = optimization?.edges || []
  const removedEdges = optimization?.removed_edges || []
  const changes = optimization?.changes || {}
  const descriptions = changes.description || []
  const nodesAdded = changes.nodes_added || []

  useEffect(() => {
    setPhase("hidden")
    const t1 = setTimeout(() => setPhase("nodes"), 400)
    const t2 = setTimeout(() => setPhase("edges"), 1200)
    const t3 = setTimeout(() => setPhase("done"), 2400)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [optimization])

  const W = 700, H = 480, PAD = 60

  // Use optimized nodes (includes added ones), keep ORIGINAL pixel positions
  const allNodes = optNodes.length ? optNodes : originalNodes

  // Scale from raw image coords to SVG space (same as original graph)
  const maxX = Math.max(...allNodes.map(n => n.x), 1)
  const minX = Math.min(...allNodes.map(n => n.x), 0)
  const maxY = Math.max(...allNodes.map(n => n.y), 1)
  const minY = Math.min(...allNodes.map(n => n.y), 0)

  function sx(x) {
    if (maxX === minX) return W / 2
    return PAD + ((x - minX) / (maxX - minX)) * (W - PAD * 2)
  }
  function sy(y) {
    if (maxY === minY) return H / 2
    return PAD + ((y - minY) / (maxY - minY)) * (H - PAD * 2)
  }

  const positions = {}
  allNodes.forEach(n => {
    positions[n.id] = { x: sx(n.x), y: sy(n.y) }
  })

  const allEdges = optEdges.length ? optEdges : originalEdges
  const hasChanges = (changes.edges_added?.length > 0) || (changes.edges_removed?.length > 0) || (nodesAdded.length > 0)

  // Node size scales down when there are many nodes
  const nodeR = allNodes.length > 15 ? 14 : allNodes.length > 10 ? 17 : 20
  const fontSize = allNodes.length > 15 ? 8 : allNodes.length > 10 ? 9 : 11
  const labelSize = allNodes.length > 15 ? 7 : 9

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 40px",
      borderBottom: "1px solid rgba(255,255,255,0.05)"
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 48,
        animation: "fadeUp 0.8s ease forwards"
      }}>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 11,
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase"
        }}>06 — Optimized Graph</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both"
      }}>
        Optimized <span style={{ color: "#e8ff47" }}>structure</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 56, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        {hasChanges
          ? "Same topology — improved reliability and balance"
          : "No optimizations needed — graph is already well-structured"}
      </p>

      {/* SVG Graph — same layout as original */}
      <div style={{
        width: "100%", maxWidth: 800,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 24, overflow: "hidden",
        animation: "scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both"
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          <defs>
            <filter id="glow-opt">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges — clean, uniform style */}
          {phase !== "hidden" && allEdges.map((e, i) => {
            const src = positions[e.source]
            const tgt = positions[e.target]
            if (!src || !tgt) return null
            return (
              <line key={`edge-${i}`}
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={phase === "edges" || phase === "done" ? "rgba(232,255,71,0.35)" : "transparent"}
                strokeWidth={1.8}
                filter="url(#glow-opt)"
                style={{ transition: `stroke 0.5s ease ${i * 0.06}s` }}
              />
            )
          })}

          {/* Nodes */}
          {allNodes.map((n, i) => {
            const pos = positions[n.id]
            if (!pos) return null
            const color = TYPE_COLORS[n.type] || "#fff"
            const nodeVisible = phase !== "hidden"
            return (
              <g key={n.id} style={{
                opacity: nodeVisible ? 1 : 0,
                transition: `opacity 0.5s ease ${i * 0.08}s`
              }}>
                <circle cx={pos.x} cy={pos.y} r={nodeR + 6}
                  fill={`${color}08`}
                />
                <circle cx={pos.x} cy={pos.y} r={nodeR}
                  fill={`${color}90`}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.6}
                  filter="url(#glow-opt)"
                />
                <text x={pos.x} y={pos.y + fontSize * 0.4} textAnchor="middle"
                  fontFamily="var(--font-display)" fontSize={fontSize}
                  fontWeight={800} fill="#000">
                  {n.id}
                </text>
                <text x={pos.x} y={pos.y + nodeR + 16} textAnchor="middle"
                  fontFamily="var(--font-body)" fontSize={labelSize}
                  fill={color} fillOpacity={0.8} letterSpacing={1}>
                  {n.type?.toUpperCase()}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Changes list */}
      {descriptions.length > 0 && descriptions[0] !== "No optimizations needed — the graph is already well-structured." && (
        <div style={{
          marginTop: 32, width: "100%", maxWidth: 640,
          animation: "fadeUp 0.6s ease 1s both"
        }}>
          {descriptions.map((desc, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              padding: "10px 16px", marginBottom: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10
            }}>
              <span style={{ color: "#69e08a", fontSize: 12, marginTop: 2, flexShrink: 0 }}>•</span>
              <p style={{
                fontFamily: "var(--font-body)", fontSize: 13,
                lineHeight: 1.5, color: "rgba(255,255,255,0.5)", fontWeight: 300
              }}>{desc}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
