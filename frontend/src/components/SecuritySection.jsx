import { useState, useEffect } from "react"

const LEVEL_CONFIG = {
  critical: { color: "#ff4444", bg: "rgba(255,68,68,0.06)", border: "rgba(255,68,68,0.25)", icon: "✕", label: "CRITICAL" },
  warning:  { color: "#ffb84d", bg: "rgba(255,184,77,0.06)", border: "rgba(255,184,77,0.25)", icon: "!", label: "WARNING"  },
  info:     { color: "#47c8ff", bg: "rgba(71,200,255,0.06)", border: "rgba(71,200,255,0.25)", icon: "i", label: "INFO"     },
  good:     { color: "#69e08a", bg: "rgba(105,224,138,0.06)", border: "rgba(105,224,138,0.25)", icon: "✓", label: "GOOD"   },
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? "#69e08a" : score >= 50 ? "#ffb84d" : "#ff4444"
  const label = score >= 80 ? "Secure" : score >= 50 ? "Moderate" : "Vulnerable"
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={54} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle cx={70} cy={70} r={54} fill="none"
          stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x={70} y={64} textAnchor="middle"
          fontFamily="var(--font-display)" fontSize={28} fontWeight={800} fill={color}>
          {score}
        </text>
        <text x={70} y={82} textAnchor="middle"
          fontFamily="var(--font-body)" fontSize={10} fill="rgba(255,255,255,0.3)"
          letterSpacing={1}>
          / 100
        </text>
      </svg>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 14,
        fontWeight: 700, color, marginTop: 4
      }}>{label}</div>
    </div>
  )
}

export default function SecuritySection({ security, onReset }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    if (!security?.insights) return
    setVisible([])
    security.insights.forEach((_, i) => {
      setTimeout(() => setVisible(prev => [...prev, i]), 300 + i * 300)
    })
  }, [security])

  if (!security) return null

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 40px 160px",
    }}>
      {/* Label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 48,
        animation: "fadeUp 0.8s ease forwards"
      }}>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 11,
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase"
        }}>Security Analysis</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both"
      }}>
        Security <span style={{ color: "#e8ff47" }}>insights</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 64, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        Structural vulnerability and health assessment
      </p>

      <div style={{ width: "100%", maxWidth: 860 }}>
        {/* Score + Summary */}
        <div style={{
          display: "flex", gap: 32, alignItems: "center",
          padding: "40px", marginBottom: 32,
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 24, background: "rgba(255,255,255,0.02)",
          animation: "fadeUp 0.6s ease forwards",
          flexWrap: "wrap"
        }}>
          <ScoreGauge score={security.score || 0} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{
              fontSize: 11, letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)", marginBottom: 12
            }}>Security Score</div>
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: 18, lineHeight: 1.7,
              color: "rgba(255,255,255,0.75)", fontWeight: 300
            }}>{security.summary}</p>
            <div style={{
              display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap"
            }}>
              {["critical","warning","info","good"].map(level => {
                const count = (security.insights || []).filter(i => i.level === level).length
                if (!count) return null
                const cfg = LEVEL_CONFIG[level]
                return (
                  <div key={level} style={{
                    padding: "4px 12px",
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 100,
                    fontSize: 11, color: cfg.color,
                    fontFamily: "var(--font-body)", fontWeight: 600,
                    letterSpacing: "0.06em"
                  }}>
                    {count} {cfg.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(security.insights || []).map((insight, i) => {
            const cfg = LEVEL_CONFIG[insight.level] || LEVEL_CONFIG.info
            return (
              <div key={i} style={{
                padding: "28px 32px",
                border: `1px solid ${cfg.border}`,
                borderLeft: `3px solid ${cfg.color}`,
                borderRadius: 16,
                background: cfg.bg,
                opacity: visible.includes(i) ? 1 : 0,
                transform: visible.includes(i) ? "translateX(0)" : "translateX(-24px)",
                transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)"
              }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${cfg.color}15`,
                    border: `1px solid ${cfg.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: cfg.color, fontWeight: 700
                  }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15, fontWeight: 700, color: "#fff"
                      }}>{insight.title}</span>
                      <span style={{
                        padding: "2px 8px",
                        background: `${cfg.color}15`,
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 100,
                        fontSize: 9, fontWeight: 700,
                        color: cfg.color, letterSpacing: "0.1em",
                        fontFamily: "var(--font-body)"
                      }}>{cfg.label}</span>
                    </div>
                    <p style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14, lineHeight: 1.7,
                      color: "rgba(255,255,255,0.55)",
                      fontWeight: 300, marginBottom: 12
                    }}>{insight.description}</p>
                    <div style={{
                      display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10
                    }}>
                      <span style={{ color: "#e8ff47", fontSize: 12, marginTop: 1 }}>→</span>
                      <p style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 13, lineHeight: 1.6,
                        color: "rgba(255,255,255,0.45)",
                        fontWeight: 400
                      }}>{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        {visible.length === (security.insights || []).length && (security.insights || []).length > 0 && (
          <div style={{
            marginTop: 80, textAlign: "center",
            animation: "fadeUp 0.8s ease 0.4s both"
          }}>
            <p style={{
              fontSize: 13, color: "rgba(255,255,255,0.2)",
              fontFamily: "var(--font-body)", marginBottom: 20,
              letterSpacing: "0.05em"
            }}>
              Analyze another network diagram
            </p>
            <button onClick={onReset} style={{
              padding: "16px 48px", background: "transparent",
              border: "1px solid rgba(232,255,71,0.4)", borderRadius: 100,
              cursor: "pointer", fontFamily: "var(--font-display)",
              fontSize: 15, fontWeight: 700, letterSpacing: "0.04em",
              color: "#e8ff47", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)"
            }}
              onMouseEnter={e => { e.target.style.background="#e8ff47"; e.target.style.color="#000" }}
              onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color="#e8ff47" }}
            >
              Analyze New Network →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}