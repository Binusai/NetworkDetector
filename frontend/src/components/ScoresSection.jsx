import { useState, useEffect } from "react"

function ScoreRing({ score, label, color, delay = 0 }) {
  const [animScore, setAnimScore] = useState(0)
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (animScore / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setAnimScore(score), delay)
    return () => clearTimeout(t)
  }, [score, delay])

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={40} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle cx={50} cy={50} r={40} fill="none"
          stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <text x={50} y={54} textAnchor="middle"
          fontFamily="var(--font-display)" fontSize={22} fontWeight={800} fill={color}>
          {animScore}
        </text>
      </svg>
      <div style={{
        fontFamily: "var(--font-body)", fontSize: 11,
        color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em",
        textTransform: "uppercase", marginTop: 4
      }}>{label}</div>
    </div>
  )
}

function ScoreColumn({ title, subtitle, scores, accentColor, delay = 0, highlight = false }) {
  if (!scores) return null

  return (
    <div style={{
      flex: 1, minWidth: 220,
      padding: "36px 28px",
      background: highlight ? "rgba(232,255,71,0.03)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${highlight ? "rgba(232,255,71,0.15)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 20,
      textAlign: "center",
      animation: `fadeUp 0.6s ease ${delay}s both`
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 16,
        fontWeight: 700, color: "#fff", marginBottom: 4
      }}>{title}</div>
      <div style={{
        fontSize: 11, color: "rgba(255,255,255,0.3)",
        fontFamily: "var(--font-body)", marginBottom: 28,
        letterSpacing: "0.05em"
      }}>{subtitle}</div>

      {/* Overall Score */}
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 52,
        fontWeight: 800, color: accentColor, lineHeight: 1,
        marginBottom: 6
      }}>{scores.overall}</div>
      <div style={{
        fontSize: 10, color: "rgba(255,255,255,0.25)",
        fontFamily: "var(--font-body)", letterSpacing: "0.1em",
        textTransform: "uppercase", marginBottom: 32
      }}>OVERALL</div>

      {/* Individual Scores */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap"
      }}>
        <ScoreRing score={scores.reliability} label="Reliability" color="#47c8ff" delay={delay + 0.2} />
        <ScoreRing score={scores.efficiency} label="Efficiency" color="#ffb84d" delay={delay + 0.4} />
        <ScoreRing score={scores.connectivity} label="Connect." color="#69e08a" delay={delay + 0.6} />
      </div>
    </div>
  )
}

export default function ScoresSection({ scores }) {
  if (!scores) return null

  const original = scores.original
  const optimized = scores.optimized
  const alternative = scores.alternative

  // Calculate improvements
  const optImprovement = optimized && original
    ? optimized.overall - original.overall : 0
  const altImprovement = alternative && original
    ? alternative.overall - original.overall : 0

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
        }}>08 — Scoring</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center", marginBottom: 16,
        animation: "fadeUp 0.8s ease 0.1s both"
      }}>
        Compare <span style={{ color: "#e8ff47" }}>scores</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 56, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s ease 0.2s both"
      }}>
        Reliability · Efficiency · Connectivity — across all graph versions
      </p>

      {/* Score Columns */}
      <div style={{
        display: "flex", gap: 20, width: "100%", maxWidth: 1000,
        flexWrap: "wrap", justifyContent: "center"
      }}>
        <ScoreColumn
          title="Original"
          subtitle="As detected"
          scores={original}
          accentColor="rgba(255,255,255,0.6)"
          delay={0.3}
        />
        <ScoreColumn
          title="Optimized"
          subtitle={optImprovement > 0 ? `+${optImprovement} points` : "Same structure"}
          scores={optimized}
          accentColor="#e8ff47"
          delay={0.5}
          highlight={optImprovement > 0}
        />
        {alternative && (
          <ScoreColumn
            title="Alternative"
            subtitle={altImprovement > 0 ? `+${altImprovement} points` : "Different topology"}
            scores={alternative}
            accentColor="#47c8ff"
            delay={0.7}
            highlight={altImprovement > optImprovement}
          />
        )}
      </div>

      {/* Improvement badge */}
      {(optImprovement > 0 || altImprovement > 0) && (
        <div style={{
          marginTop: 40,
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 24px",
          background: "rgba(105,224,138,0.08)",
          border: "1px solid rgba(105,224,138,0.2)",
          borderRadius: 100,
          animation: "fadeUp 0.6s ease 1s both"
        }}>
          <span style={{ color: "#69e08a", fontSize: 14 }}>↑</span>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 13,
            color: "#69e08a", fontWeight: 500
          }}>
            {Math.max(optImprovement, altImprovement)} point improvement available
          </span>
        </div>
      )}
    </section>
  )
}
