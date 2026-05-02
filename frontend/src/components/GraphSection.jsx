import { useState, useEffect, useRef } from "react"

const TYPE_COLORS = {
  computer: "#47c8ff", hub: "#69e08a", switch: "#ffb84d", router: "#ff6b6b"
}
const TYPE_ICONS = { computer: "💻", hub: "🔀", switch: "🔄", router: "📡" }

export default function GraphSection({ nodes, edges }) {
  const [phase, setPhase] = useState("hidden") // hidden | nodes | edges | done
  const svgRef = useRef()

  useEffect(() => {
    setPhase("hidden")
    const t1 = setTimeout(() => setPhase("nodes"), 400)
    const t2 = setTimeout(() => setPhase("edges"), 2000)
    const t3 = setTimeout(() => setPhase("done"),  4500)
    return () => [t1,t2,t3].forEach(clearTimeout)
  }, [nodes, edges])

  const W = 700, H = 480, PAD = 80

  const maxX = Math.max(...nodes.map(n => n.x), 1)
  const minX = Math.min(...nodes.map(n => n.x), 0)
  const maxY = Math.max(...nodes.map(n => n.y), 1)
  const minY = Math.min(...nodes.map(n => n.y), 0)

  function sx(x) {
    if (maxX === minX) return W / 2
    return PAD + ((x - minX) / (maxX - minX)) * (W - PAD * 2)
  }
  function sy(y) {
    if (maxY === minY) return H / 2
    return PAD + ((y - minY) / (maxY - minY)) * (H - PAD * 2)
  }

  const positions = nodes.reduce((acc, n) => {
    acc[n.id] = { x: sx(n.x), y: sy(n.y) }
    return acc
  }, {})

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
        }}>03 — Network Graph</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both"
      }}>
        Building the <span style={{ color: "#e8ff47" }}>graph</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 56, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        Nodes lifted from detection — edges drawn from connection analysis
      </p>

      {/* SVG Graph */}
      <div style={{
        width: "100%", maxWidth: 800,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 24, overflow: "hidden",
        animation: "scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both"
      }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", display: "block" }}
        >
          <defs>
            {nodes.map(n => (
              <radialGradient key={n.id} id={`grd-${n.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={TYPE_COLORS[n.type] || "#fff"} stopOpacity="0.9" />
                <stop offset="100%" stopColor={TYPE_COLORS[n.type] || "#fff"} stopOpacity="0.4" />
              </radialGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {phase !== "hidden" && edges.map((e, i) => {
            const src = positions[e.source]
            const tgt = positions[e.target]
            if (!src || !tgt) return null
            const len = Math.hypot(tgt.x - src.x, tgt.y - src.y)
            return (
              <line key={i}
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={phase === "edges" || phase === "done"
                  ? "rgba(232,255,71,0.35)"
                  : "rgba(255,255,255,0.0)"}
                strokeWidth={phase === "done" ? 2 : 1.5}
                strokeDasharray={len}
                strokeDashoffset={phase === "edges" || phase === "done" ? 0 : len}
                style={{
                  transition: `stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1) ${i*0.12}s, stroke 0.5s ease, stroke-width 0.5s ease`
                }}
                filter="url(#glow)"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((n, i) => {
            const pos = positions[n.id]
            const color = TYPE_COLORS[n.type] || "#fff"
            const visible = phase !== "hidden"
            return (
              <g key={n.id} style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : `translate(0, 20px)`,
                transition: `opacity 0.6s ease ${i*0.15}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i*0.15}s`
              }}>
                {/* Glow ring */}
                <circle cx={pos.x} cy={pos.y} r={28}
                  fill={`${color}08`}
                  style={{
                    animation: phase === "done" ? `nodeFloat ${3+i*0.4}s ease-in-out ${i*0.3}s infinite` : "none"
                  }}
                />
                {/* Main circle */}
                <circle cx={pos.x} cy={pos.y} r={22}
                  fill={`url(#grd-${n.id})`}
                  filter="url(#glow)"
                  style={{
                    animation: phase === "done" ? `nodeFloat ${3+i*0.4}s ease-in-out ${i*0.3}s infinite` : "none"
                  }}
                />
                {/* Border */}
                <circle cx={pos.x} cy={pos.y} r={22}
                  fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
                />
                {/* ID text */}
                <text x={pos.x} y={pos.y+5} textAnchor="middle"
                  fontFamily="var(--font-display)" fontSize={13}
                  fontWeight={800} fill="#000">
                  {n.id}
                </text>
                {/* Type label below */}
                <text x={pos.x} y={pos.y + 42} textAnchor="middle"
                  fontFamily="var(--font-body)" fontSize={10}
                  fill={color} fillOpacity={0.8} letterSpacing={1}>
                  {n.type.toUpperCase()}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 24, marginTop: 32, flexWrap: "wrap",
        justifyContent: "center",
        animation: "fadeUp 0.6s ease 1s both"
      }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => {
          const count = nodes.filter(n => n.type === type).length
          if (!count) return null
          return (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
              <span style={{
                fontSize: 12, color: "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-body)"
              }}>
                {type} <span style={{ color: color }}>×{count}</span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}