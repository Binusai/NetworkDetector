import { useState, useEffect } from "react"

const TOPOLOGY_CONFIG = {
  "Star Topology":           { color: "#47c8ff", icon: "✦", desc: "One central node controls all traffic" },
  "Bus Topology":            { color: "#ffb84d", icon: "⬛", desc: "Devices connected along a single backbone" },
  "Ring Topology":           { color: "#69e08a", icon: "◯", desc: "Devices form a closed loop" },
  "Tree Topology":           { color: "#c084fc", icon: "⑂", desc: "Hierarchical branching structure" },
  "Mesh Topology (Full)":    { color: "#f472b6", icon: "⬡", desc: "Every node connected to every other node" },
  "Mesh Topology (Partial)": { color: "#fb923c", icon: "⬡", desc: "Multiple redundant paths between nodes" },
  "Hybrid Topology":         { color: "#a78bfa", icon: "⊕", desc: "Mixed topology patterns detected" },
}

export default function TopologySection({ topology, explanation, nodes, edges }) {
  const [revealed, setRevealed] = useState(false)
  const [charCount, setCharCount] = useState(0)

  const config = TOPOLOGY_CONFIG[topology] || { color: "#e8ff47", icon: "?", desc: "" }

  useEffect(() => {
    setRevealed(false)
    setCharCount(0)
    const t = setTimeout(() => setRevealed(true), 400)
    return () => clearTimeout(t)
  }, [topology])

  // Typewriter for explanation
  useEffect(() => {
    if (!revealed) return
    setCharCount(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setCharCount(i)
      if (i >= explanation.length) clearInterval(interval)
    }, 18)
    return () => clearInterval(interval)
  }, [revealed, explanation])

  const stats = [
    { label: "Nodes",     value: nodes.length },
    { label: "Edges",     value: edges.length },
    { label: "High Conf", value: edges.filter(e => e.confidence === "High").length },
    { label: "Devices",   value: [...new Set(nodes.map(n => n.type))].length + " types" },
  ]

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 40px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      position: "relative", overflow: "hidden"
    }}>
      {/* Background accent */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${config.color}06 0%, transparent 70%)`
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 860 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 64, justifyContent: "center",
          animation: "fadeUp 0.8s ease forwards"
        }}>
          <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 11,
            letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase"
          }}>04 — Topology Result</span>
          <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Big topology name */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            fontSize: 72, marginBottom: 16,
            color: config.color,
            animation: revealed ? "scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards" : "none",
            opacity: revealed ? 1 : 0
          }}>
            {config.icon}
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(40px, 7vw, 80px)",
            fontWeight: 800, letterSpacing: "-0.04em",
            color: config.color,
            lineHeight: 1,
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s"
          }}>
            {topology}
          </h1>
          <p style={{
            fontSize: 15, color: "rgba(255,255,255,0.35)",
            marginTop: 12, fontFamily: "var(--font-body)",
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.8s ease 0.4s"
          }}>
            {config.desc}
          </p>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1, marginBottom: 64,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, overflow: "hidden",
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.8s ease 0.5s"
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              padding: "28px 24px", textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none"
            }}>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 36, fontWeight: 800,
                color: config.color, lineHeight: 1,
                marginBottom: 8
              }}>{s.value}</div>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "var(--font-body)"
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Explanation with typewriter */}
        <div style={{
          padding: "36px 40px",
          border: `1px solid ${config.color}22`,
          borderLeft: `3px solid ${config.color}`,
          borderRadius: 16,
          background: `${config.color}06`,
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.5s ease 0.6s"
        }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 11, letterSpacing: "0.15em",
            color: config.color, textTransform: "uppercase",
            marginBottom: 16, opacity: 0.7
          }}>Why this topology?</p>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 18, lineHeight: 1.8,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 300
          }}>
            {explanation.slice(0, charCount)}
            {charCount < explanation.length && (
              <span style={{
                display: "inline-block", width: 2, height: 20,
                background: config.color, marginLeft: 2,
                verticalAlign: "middle",
                animation: "blink 0.7s step-end infinite"
              }} />
            )}
          </p>
        </div>
      </div>
    </section>
  )
}