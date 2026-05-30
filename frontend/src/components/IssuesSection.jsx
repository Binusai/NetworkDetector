import { useState, useEffect } from "react"

const SEVERITY_CONFIG = {
  critical: { color: "#ff4444", bg: "rgba(255,68,68,0.06)", border: "rgba(255,68,68,0.20)", icon: "✕" },
  warning:  { color: "#ffb84d", bg: "rgba(255,184,77,0.06)", border: "rgba(255,184,77,0.20)", icon: "⚠" },
  info:     { color: "#47c8ff", bg: "rgba(71,200,255,0.06)", border: "rgba(71,200,255,0.20)", icon: "ℹ" },
}

export default function IssuesSection({ issues }) {
  const [visible, setVisible] = useState([])

  const issueList = issues?.issues || []

  useEffect(() => {
    setVisible([])
    issueList.forEach((_, i) => {
      setTimeout(() => setVisible(prev => [...prev, i]), 400 + i * 250)
    })
  }, [issues])

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
        }}>05 — Issue Detection</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both"
      }}>
        Network <span style={{ color: "#e8ff47" }}>issues</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 24, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        {issues?.summary || "Analyzing network structure..."}
      </p>

      {/* Summary badges */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap",
        justifyContent: "center",
        animation: "fadeUp 0.8s ease 0.25s both"
      }}>
        {["critical", "warning", "info"].map(sev => {
          const count = issueList.filter(i => i.severity === sev).length
          if (!count) return null
          const cfg = SEVERITY_CONFIG[sev]
          return (
            <div key={sev} style={{
              padding: "6px 16px", borderRadius: 100,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: 12, fontWeight: 600, color: cfg.color,
              fontFamily: "var(--font-body)", letterSpacing: "0.05em"
            }}>
              {count} {sev.toUpperCase()}
            </div>
          )
        })}
        {issueList.length === 0 && (
          <div style={{
            padding: "6px 16px", borderRadius: 100,
            background: "rgba(105,224,138,0.06)",
            border: "1px solid rgba(105,224,138,0.20)",
            fontSize: 12, fontWeight: 600, color: "#69e08a",
            fontFamily: "var(--font-body)", letterSpacing: "0.05em"
          }}>
            ✓ ALL CLEAR
          </div>
        )}
      </div>

      {/* Issue Cards */}
      <div style={{
        width: "100%", maxWidth: 720,
        display: "flex", flexDirection: "column", gap: 14
      }}>
        {issueList.length === 0 && (
          <div style={{
            padding: "40px", textAlign: "center",
            border: "1px solid rgba(105,224,138,0.15)",
            borderRadius: 16, background: "rgba(105,224,138,0.04)",
            animation: "fadeUp 0.6s ease 0.4s both"
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <p style={{
              fontFamily: "var(--font-display)", fontSize: 18,
              fontWeight: 700, color: "#69e08a", marginBottom: 8
            }}>No Issues Found</p>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-body)"
            }}>
              The network structure is healthy and well-connected.
            </p>
          </div>
        )}

        {issueList.map((issue, i) => {
          const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info
          return (
            <div key={i} style={{
              padding: "22px 28px",
              border: `1px solid ${cfg.border}`,
              borderLeft: `3px solid ${cfg.color}`,
              borderRadius: 14,
              background: cfg.bg,
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? "translateY(0)" : "translateY(16px)",
              transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)"
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${cfg.color}15`, border: `1px solid ${cfg.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, color: cfg.color, fontWeight: 700
                }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: 10,
                      fontWeight: 700, color: cfg.color,
                      letterSpacing: "0.1em", textTransform: "uppercase"
                    }}>
                      {issue.type.replace(/_/g, " ")}
                    </span>
                    {issue.node !== null && issue.node !== undefined && (
                      <span style={{
                        padding: "1px 8px", borderRadius: 100,
                        background: "rgba(255,255,255,0.06)",
                        fontSize: 10, color: "rgba(255,255,255,0.35)",
                        fontFamily: "var(--font-body)"
                      }}>
                        Node #{issue.node}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 14, lineHeight: 1.65,
                    color: "rgba(255,255,255,0.6)", fontWeight: 300
                  }}>
                    {issue.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
