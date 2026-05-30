import { useState, useEffect, useMemo } from "react"
import { computeTopologyLayout } from "./graphLayout"

const TYPE_COLORS = {
  computer: "#47c8ff",
  hub: "#69e08a",
  switch: "#ffb84d",
  router: "#ff6b6b",
}

// Convert all ids to strings — JS object keys are always strings,
// so numeric ids from the API cause silent lookup misses.
function toStr(nodes, edges) {
  const ns = (nodes || []).map(n => ({ ...n, id: String(n.id) }))
  const es = (edges || []).map(e => ({
    ...e,
    source: String(e.source),
    target: String(e.target),
  }))
  return { ns, es }
}

// Safety net: if any router has zero edges in the list,
// wire it to the first available switch/hub.
// This handles serialisation gaps from the backend.
function ensureRouterConnected(nodes, edges) {
  const result = [...edges]
  const has = (a, b) => result.some(
    e => (e.source === a && e.target === b) || (e.source === b && e.target === a)
  )

  const routers = nodes.filter(n => n.type === "router").map(n => n.id)
  const switches = nodes.filter(n => n.type === "switch" || n.type === "hub").map(n => n.id)

  for (const rid of routers) {
    const connected = result.some(e => e.source === rid || e.target === rid)
    if (!connected && switches.length) {
      result.push({ source: rid, target: switches[0] })
    }
  }
  return result
}

export default function AlternativeSection({ alternative, originalNodes }) {
  const [phase, setPhase] = useState("hidden")

  const suggested = alternative?.suggested
  const altTopo = alternative?.alternative_topology || ""
  const reason = alternative?.reason || ""

  const { ns: altNodes, es: altEdgesRaw } = useMemo(
    () => toStr(alternative?.nodes, alternative?.edges),
    [alternative]
  )
  const { ns: origNodes } = useMemo(
    () => toStr(originalNodes, []),
    [originalNodes]
  )

  useEffect(() => {
    setPhase("hidden")
    const t1 = setTimeout(() => setPhase("nodes"), 400)
    const t2 = setTimeout(() => setPhase("edges"), 1200)
    const t3 = setTimeout(() => setPhase("done"), 2400)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [alternative])

  const displayNodes = suggested && altNodes.length ? altNodes : origNodes
  const displayEdges = useMemo(() => {
    if (!suggested) return []
    return ensureRouterConnected(displayNodes, altEdgesRaw)
  }, [suggested, displayNodes, altEdgesRaw])

  const layoutTopo = suggested ? (altTopo || "Tree Topology") : "Tree Topology"
  const positions = useMemo(
    () => computeTopologyLayout(displayNodes, displayEdges, layoutTopo),
    [displayNodes, displayEdges, layoutTopo]
  )

  const n = displayNodes.length
  const nodeR = n > 15 ? 11 : n > 10 ? 14 : 18
  const fontSize = n > 15 ? 7 : n > 10 ? 9 : 10
  const labelSz = n > 15 ? 6 : n > 10 ? 7 : 8

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 40px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>

      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 48,
        animation: "fadeUp 0.8s ease forwards",
      }}>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 11,
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
        }}>07 — Alternative Topology</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both",
      }}>
        {suggested
          ? <>Better <span style={{ color: "#e8ff47" }}>topology</span></>
          : <>Topology <span style={{ color: "#69e08a" }}>optimal</span></>}
      </h2>

      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 56, textAlign: "center",
        fontFamily: "var(--font-body)", maxWidth: 600,
        animation: "fadeUp 0.8s ease 0.2s both",
      }}>
        {reason}
      </p>

      {suggested ? (
        <>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "8px 20px", marginBottom: 32,
            background: "rgba(232,255,71,0.08)",
            border: "1px solid rgba(232,255,71,0.25)",
            borderRadius: 100,
            animation: "fadeUp 0.6s ease 0.3s both",
          }}>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 13,
              fontWeight: 700, color: "rgba(255,255,255,0.5)",
            }}>
              {alternative?.current_topology}
            </span>
            <span style={{ color: "#e8ff47", fontSize: 16 }}>→</span>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 13,
              fontWeight: 700, color: "#e8ff47",
            }}>
              {altTopo}
            </span>
          </div>

          <div style={{
            width: "100%", maxWidth: 860,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 24, overflow: "hidden",
            animation: "scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both",
          }}>
            <svg viewBox="0 0 700 520" style={{ width: "100%", display: "block" }}>
              <defs>
                <filter id="glow-alt" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Edges first so nodes render on top */}
              {displayEdges.map((e, i) => {
                const src = positions[e.source]
                const tgt = positions[e.target]
                if (!src || !tgt) return null
                const visible = phase === "edges" || phase === "done"
                return (
                  <line
                    key={`e-${i}`}
                    x1={src.x} y1={src.y}
                    x2={tgt.x} y2={tgt.y}
                    stroke="rgba(232,255,71,0.6)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    filter="url(#glow-alt)"
                    style={{
                      opacity: visible ? 1 : 0,
                      transition: `opacity 0.4s ease ${i * 0.05}s`,
                    }}
                  />
                )
              })}

              {/* Nodes */}
              {displayNodes.map((nd, i) => {
                const pos = positions[nd.id]
                if (!pos) return null
                const color = TYPE_COLORS[nd.type] || "#fff"
                const visible = phase !== "hidden"
                return (
                  <g key={nd.id} style={{
                    opacity: visible ? 1 : 0,
                    transition: `opacity 0.5s ease ${i * 0.06}s`,
                  }}>
                    <circle cx={pos.x} cy={pos.y} r={nodeR + 6} fill={`${color}12`} />
                    <circle
                      cx={pos.x} cy={pos.y} r={nodeR}
                      fill={`${color}88`}
                      stroke={color} strokeWidth={1.8}
                      filter="url(#glow-alt)"
                    />
                    <text
                      x={pos.x} y={pos.y + fontSize * 0.38}
                      textAnchor="middle"
                      fontFamily="var(--font-display)"
                      fontSize={fontSize} fontWeight={800} fill="#000"
                    >
                      {nd.id}
                    </text>
                    <text
                      x={pos.x} y={pos.y + nodeR + 13}
                      textAnchor="middle"
                      fontFamily="var(--font-body)"
                      fontSize={labelSz} fill={color} fillOpacity={0.9}
                      letterSpacing={0.5}
                    >
                      {nd.type?.toUpperCase()}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </>
      ) : (
        <div style={{
          padding: "48px", textAlign: "center",
          border: "1px solid rgba(105,224,138,0.15)",
          borderRadius: 20, background: "rgba(105,224,138,0.04)",
          maxWidth: 500,
          animation: "fadeUp 0.6s ease 0.3s both",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <p style={{
            fontFamily: "var(--font-display)", fontSize: 20,
            fontWeight: 700, color: "#69e08a", marginBottom: 8,
          }}>Current topology is optimal</p>
          <p style={{
            fontSize: 14, color: "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-body)", lineHeight: 1.6,
          }}>
            {reason}
          </p>
        </div>
      )}
    </section>
  )
}