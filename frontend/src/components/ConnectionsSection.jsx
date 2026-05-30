import { useState, useEffect } from "react"

const TYPE_COLORS = {
  computer: "#47c8ff", hub: "#69e08a", switch: "#ffb84d", router: "#ff6b6b"
}

const TYPE_ICONS = {
  computer: "💻", hub: "🔀", switch: "🔄", router: "📡"
}

export default function ConnectionsSection({ edges, nodes }) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    setVisibleCount(0)
    const interval = Math.min(180, 2200 / Math.max(edges.length, 1))
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
      {/* Header */}
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
        Device <span style={{ color: "#e8ff47" }}>connections</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 56, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        How your network devices are linked together
      </p>

      {/* Connection Cards */}
      <div style={{
        width: "100%", maxWidth: 640,
        display: "flex", flexDirection: "column", gap: 12,
        animation: "fadeUp 0.8s ease 0.3s both"
      }}>
        {edges.slice(0, visibleCount).map((edge, i) => {
          const src = nodes.find(n => n.id === edge.source)
          const tgt = nodes.find(n => n.id === edge.target)
          const srcColor = TYPE_COLORS[src?.type] || "#fff"
          const tgtColor = TYPE_COLORS[tgt?.type] || "#fff"
          const srcIcon = TYPE_ICONS[src?.type] || "?"
          const tgtIcon = TYPE_ICONS[tgt?.type] || "?"

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 0,
              padding: "16px 24px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              animation: "slideRight 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
              transition: "all 0.25s ease",
              cursor: "default"
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                e.currentTarget.style.borderColor = "rgba(232,255,71,0.15)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.02)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"
              }}
            >
              {/* Source Device */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                flex: 1, minWidth: 0
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${srcColor}18`,
                  border: `1px solid ${srcColor}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0
                }}>
                  {srcIcon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13, fontWeight: 700,
                    color: srcColor,
                    textTransform: "capitalize"
                  }}>
                    {src?.type || "?"}
                  </div>
                  <div style={{
                    fontSize: 10, color: "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-body)"
                  }}>
                    Node #{edge.source}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                display: "flex", alignItems: "center", gap: 0,
                padding: "0 16px", flexShrink: 0
              }}>
                <div style={{
                  width: 40, height: 1,
                  background: "linear-gradient(90deg, rgba(232,255,71,0.1), rgba(232,255,71,0.5))"
                }} />
                <div style={{
                  width: 0, height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: "8px solid rgba(232,255,71,0.5)"
                }} />
              </div>

              {/* Target Device */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                flex: 1, minWidth: 0,
                justifyContent: "flex-end", textAlign: "right"
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13, fontWeight: 700,
                    color: tgtColor,
                    textTransform: "capitalize"
                  }}>
                    {tgt?.type || "?"}
                  </div>
                  <div style={{
                    fontSize: 10, color: "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-body)"
                  }}>
                    Node #{edge.target}
                  </div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${tgtColor}18`,
                  border: `1px solid ${tgtColor}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0
                }}>
                  {tgtIcon}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Counter */}
      <div style={{
        marginTop: 24,
        display: "flex", alignItems: "center", gap: 12
      }}>
        <span style={{
          fontSize: 12, color: "rgba(255,255,255,0.25)",
          fontFamily: "var(--font-body)"
        }}>
          {visibleCount} of {edges.length} connections mapped
        </span>
        {visibleCount === edges.length && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#e8ff47",
              animation: "pulse 2s ease-in-out infinite"
            }} />
            <span style={{
              fontSize: 12, color: "rgba(232,255,71,0.6)",
              fontFamily: "var(--font-body)"
            }}>
              Complete
            </span>
          </div>
        )}
      </div>
    </section>
  )
}