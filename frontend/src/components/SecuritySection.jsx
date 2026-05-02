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

export default function SecuritySection({ topology, nodes, edges, warnings, onReset }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [visible, setVisible]   = useState([])

  useEffect(() => {
    fetchInsights()
  }, [topology])

  async function fetchInsights() {
    setLoading(true)
    setInsights(null)
    setVisible([])

    const nodeTypes = nodes.map(n => n.type)
    const typeCounts = nodeTypes.reduce((a, t) => ({ ...a, [t]: (a[t]||0)+1 }), {})

    const prompt = `You are a network security expert. Analyze this network topology and return ONLY a JSON object (no markdown, no explanation outside JSON).

Network details:
- Topology: ${topology}
- Total nodes: ${nodes.length}
- Device breakdown: ${JSON.stringify(typeCounts)}
- Total connections: ${edges.length}
- High-confidence edges: ${edges.filter(e=>e.confidence==="High").length}

Return this exact JSON structure:
{
  "score": <integer 0-100 representing overall security score>,
  "summary": "<one sentence overall assessment>",
  "insights": [
    {
      "level": "<critical|warning|info|good>",
      "title": "<short title>",
      "description": "<what the issue or strength is, 1-2 sentences>",
      "recommendation": "<specific actionable fix or next step, 1-2 sentences>"
    }
  ]
}

Provide 4-6 insights. Be specific to the actual topology type (${topology}). Focus on real network security and reliability concerns.`

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.find(b => b.type === "text")?.text || ""
      const clean = text.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)
      setInsights(parsed)

      // Animate cards in one by one
      parsed.insights.forEach((_, i) => {
        setTimeout(() => setVisible(prev => [...prev, i]), 300 + i * 300)
      })
    } catch (err) {
      // Fallback to rule-based insights
      const fallback = buildFallback(topology, nodes, edges, warnings)
      setInsights(fallback)
      fallback.insights.forEach((_, i) => {
        setTimeout(() => setVisible(prev => [...prev, i]), 300 + i * 300)
      })
    } finally {
      setLoading(false)
    }
  }

  function buildFallback(topology, nodes, edges, warnings) {
    const hasHub = nodes.some(n => ["hub","switch","router"].includes(n.type))
    const score  = hasHub ? (topology.includes("Mesh") ? 85 : topology.includes("Star") ? 62 : 55) : 30
    const items  = warnings.map(w => ({
      level: w.startsWith("✅") ? "good" : w.includes("Critical") ? "critical" : "warning",
      title: w.startsWith("✅") ? "No Issues Found" : "Network Issue Detected",
      description: w.replace(/^[✅⚠️]\s*/,""),
      recommendation: "Review your network diagram and ensure all devices are properly connected with redundant paths."
    }))
    return { score, summary: `${topology} detected with ${nodes.length} devices.`, insights: items }
  }

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
        }}>05 — Security Analysis</span>
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
        AI-powered structural vulnerability and health assessment
      </p>

      {loading && (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 16, padding: "60px 0"
        }}>
          <div style={{
            width: 40, height: 40,
            border: "2px solid rgba(232,255,71,0.2)",
            borderTop: "2px solid #e8ff47",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <p style={{
            fontSize: 13, color: "rgba(255,255,255,0.3)",
            fontFamily: "var(--font-body)", letterSpacing: "0.05em"
          }}>
            Claude AI analyzing your network...
          </p>
        </div>
      )}

      {insights && (
        <div style={{ width: "100%", maxWidth: 860 }}>
          {/* Score + Summary row */}
          <div style={{
            display: "flex", gap: 32, alignItems: "center",
            padding: "40px", marginBottom: 32,
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 24, background: "rgba(255,255,255,0.02)",
            animation: "fadeUp 0.6s ease forwards"
          }}>
            <ScoreGauge score={insights.score} />
            <div style={{ flex: 1 }}>
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
              }}>{insights.summary}</p>
              <div style={{
                display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap"
              }}>
                {["critical","warning","info","good"].map(level => {
                  const count = insights.insights.filter(i => i.level === level).length
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
            {insights.insights.map((insight, i) => {
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
                    {/* Icon */}
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
                      {/* Title + badge */}
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

                      {/* Description */}
                      <p style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 14, lineHeight: 1.7,
                        color: "rgba(255,255,255,0.55)",
                        fontWeight: 300, marginBottom: 12
                      }}>{insight.description}</p>

                      {/* Recommendation */}
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
          {visible.length === insights.insights.length && (
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
      )}
    </section>
  )
}