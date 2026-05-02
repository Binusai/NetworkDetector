import { useState, useEffect } from "react"

const METHOD_META = {
  H: { label: "Hough",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  S: { label: "Sampling", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  K: { label: "Skeleton", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
}

const CONF_META = {
  High:   { color: "#69e08a", bg: "rgba(105,224,138,0.12)" },
  Medium: { color: "#ffb84d", bg: "rgba(255,184,77,0.12)" },
  Low:    { color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
}

const TYPE_COLORS = {
  computer: "#47c8ff", hub: "#69e08a", switch: "#ffb84d", router: "#ff6b6b"
}

export default function ConnectionsSection({ edges, nodes }) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    const interval = Math.min(220, 2800 / Math.max(edges.length, 1))
    const timers = edges.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), 300 + i * interval)
    )
    return () => timers.forEach(clearTimeout)
  }, [edges])

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 40px",
      borderBottom: "1px solid rgba(255,255,255,0.05)"
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 48,
        animation: "fadeUp 0.8s ease forwards"
      }}>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 11,
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase"
        }}>02 — Connections</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both"
      }}>
        Mapping <span style={{ color: "#e8ff47" }}>connections</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 64, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        Hough transform + pixel sampling + skeletonization
      </p>

      <div style={{
        width: "100%", maxWidth: 860,
        animation: "fadeUp 0.8s ease 0.3s both"
      }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          gap: 16, padding: "0 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}>
          {["Connection","Source","Target","Methods"].map(h => (
            <span key={h} style={{
              fontSize: 10, letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)"
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div>
          {edges.slice(0, visibleCount).map((edge, i) => {
            const src = nodes.find(n => n.id === edge.source)
            const tgt = nodes.find(n => n.id === edge.target)
            const conf = CONF_META[edge.confidence] || CONF_META.Low
            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 16,
                padding: "18px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                animation: "slideRight 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                transition: "background 0.2s"
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {/* Index */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 11, color: "rgba(255,255,255,0.2)",
                    fontWeight: 700, minWidth: 24
                  }}>
                    {String(i+1).padStart(2,"0")}
                  </span>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "4px 12px",
                    background: `${conf.color}10`,
                    border: `1px solid ${conf.color}30`,
                    borderRadius: 100
                  }}>
                    <span style={{
                      fontSize: 12, color: conf.color,
                      fontFamily: "var(--font-body)", fontWeight: 500
                    }}>
                      {edge.confidence}
                    </span>
                  </div>
                </div>

                {/* Source */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: TYPE_COLORS[src?.type] || "#fff"
                  }} />
                  <span style={{
                    fontSize: 13, color: "rgba(255,255,255,0.7)",
                    fontFamily: "var(--font-body)"
                  }}>
                    {src?.type || "?"} #{edge.source}
                  </span>
                </div>

                {/* Target */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: TYPE_COLORS[tgt?.type] || "#fff"
                  }} />
                  <span style={{
                    fontSize: 13, color: "rgba(255,255,255,0.7)",
                    fontFamily: "var(--font-body)"
                  }}>
                    {tgt?.type || "?"} #{edge.target}
                  </span>
                </div>

                {/* Methods */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {edge.methods.map(m => {
                    const meta = METHOD_META[m] || {}
                    return (
                      <span key={m} style={{
                        padding: "3px 10px",
                        background: meta.bg,
                        border: `1px solid ${meta.color}44`,
                        borderRadius: 100,
                        fontSize: 10, fontWeight: 600,
                        color: meta.color,
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.06em"
                      }}>{meta.label}</span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Counter */}
        <div style={{
          padding: "20px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-body)" }}>
            Showing {visibleCount} of {edges.length} connections
          </span>
          {visibleCount === edges.length && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#e8ff47",
                animation: "pulse 2s ease-in-out infinite"
              }} />
              <span style={{ fontSize: 12, color: "rgba(232,255,71,0.6)", fontFamily: "var(--font-body)" }}>
                Analysis complete
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}