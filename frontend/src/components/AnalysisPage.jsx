import { useState, useEffect, useRef, useCallback } from "react"
import ImageDetectionSection from "./ImageDetectionSection"
import ConnectionsSection from "./ConnectionsSection"
import GraphSection from "./GraphSection"
import TopologySection from "./TopologySection"
import IssuesSection from "./IssuesSection"
import OptimizedGraphSection from "./OptimizedGraphSection"
import AlternativeSection from "./AlternativeSection"
import ScoresSection from "./ScoresSection"
import SecuritySection from "./SecuritySection"

const SECTION_LABELS = [
  "Detection", "Connections", "Graph", "Topology",
  "Issues", "Optimized", "Alternative", "Scores", "Security"
]

const SECTION_KEYS = [
  "detection", "connections", "graph", "topology",
  "issues", "optimized", "alternative", "scores", "security"
]

export default function AnalysisPage({ result, preview, loading, error, onReset }) {
  const [phase, setPhase] = useState("loading")
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("netscan-theme")
    return saved !== "light"
  })

  useEffect(() => {
    localStorage.setItem("netscan-theme", isDark ? "dark" : "light")
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
  }, [isDark])

  const refs = {}
  SECTION_KEYS.forEach(key => {
    refs[key] = useRef()
  })

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useEffect(() => {
    if (loading) { setPhase("loading"); return }
    if (error)   { setPhase("error");   return }
    if (!result)  return

    // Phase sequence with auto-scroll — faster transitions
    const steps = [
      { phase: "detection",   delay: 0 },
      { phase: "connections", delay: 4000 },
      { phase: "graph",       delay: 7000 },
      { phase: "topology",    delay: 10500 },
      { phase: "issues",      delay: 14000 },
      { phase: "optimized",   delay: 17000 },
      { phase: "alternative", delay: 20500 },
      { phase: "scores",      delay: 24000 },
      { phase: "security",    delay: 27000 },
      { phase: "done",        delay: 29500 },
    ]

    const timers = steps.map(s =>
      setTimeout(() => {
        setPhase(s.phase)
        if (s.phase !== "done" && refs[s.phase]) {
          setTimeout(() => scrollTo(refs[s.phase]), 300)
        }
      }, s.delay)
    )

    return () => timers.forEach(clearTimeout)
  }, [result, loading, error])

  const phaseOrder = ["loading", ...SECTION_KEYS, "done"]
  const pi = phaseOrder.indexOf(phase)

  return (
    <div style={{
      background: isDark ? "#000" : "#f4f4f0",
      minHeight: "100vh",
      transition: "background 0.4s ease, color 0.4s ease"
    }}>
      {/* Fixed top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px",
        background: isDark ? "rgba(0,0,0,0.88)" : "rgba(244,244,240,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)"
      }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 16, fontWeight: 700, color: isDark ? "#fff" : "#111"
        }}>
          NET<span style={{ color: "#e8ff47" }}>SCAN</span>
        </div>

        {/* Nav pills - scrollable */}
        <div style={{
          display: "flex", gap: 4, alignItems: "center",
          overflowX: "auto", maxWidth: "60vw",
          scrollbarWidth: "none"
        }}>
          {SECTION_LABELS.map((label, i) => {
            const sectionPhaseIdx = i + 1 // +1 because "loading" is at 0
            const isCompleted = pi > sectionPhaseIdx
            const isCurrent = pi === sectionPhaseIdx
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  onClick={() => {
                    if (isCompleted) scrollTo(refs[SECTION_KEYS[i]])
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 100,
                    background: isCompleted ? "rgba(232,255,71,0.12)" : "transparent",
                    border: `1px solid ${isCompleted ? "rgba(232,255,71,0.3)" : isCurrent ? "rgba(232,255,71,0.2)" : "rgba(255,255,255,0.06)"}`,
                    transition: "all 0.4s ease",
                    cursor: isCompleted ? "pointer" : "default",
                    whiteSpace: "nowrap", flexShrink: 0
                  }}>
                  <div style={{
                    width: 4, height: 4, borderRadius: "50%",
                    background: isCompleted ? "#e8ff47" : isCurrent ? "rgba(232,255,71,0.5)" : "rgba(255,255,255,0.15)",
                    animation: isCurrent ? "pulse 1s ease-in-out infinite" : "none",
                    transition: "all 0.4s ease"
                  }} />
                  <span style={{
                    fontSize: 10, letterSpacing: "0.04em",
                    color: isCompleted ? "rgba(232,255,71,0.7)" : isCurrent ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.2)",
                    fontFamily: "var(--font-body)", fontWeight: 500,
                    transition: "all 0.4s ease"
                  }}>{label}</span>
                </div>
                {i < SECTION_LABELS.length - 1 && (
                  <div style={{ width: 8, height: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(d => !d)}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              width: 36, height: 20, borderRadius: 100,
              background: isDark ? "rgba(232,255,71,0.15)" : "rgba(0,0,0,0.12)",
              border: isDark ? "1px solid rgba(232,255,71,0.3)" : "1px solid rgba(0,0,0,0.15)",
              cursor: "pointer", position: "relative",
              transition: "all 0.3s ease", flexShrink: 0
            }}
          >
            <div style={{
              position: "absolute", top: 2,
              left: isDark ? 18 : 2,
              width: 14, height: 14, borderRadius: "50%",
              background: isDark ? "#e8ff47" : "#555",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)"
            }} />
          </button>
          <span style={{
            fontSize: 9, letterSpacing: "0.08em",
            color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)",
            fontFamily: "var(--font-body)"
          }}>
            {isDark ? "DARK" : "LIGHT"}
          </span>
          <button onClick={onReset} style={{
            padding: "6px 16px", background: "transparent",
            border: isDark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)",
            borderRadius: 100,
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
            fontSize: 11,
            fontFamily: "var(--font-body)", cursor: "pointer",
            letterSpacing: "0.04em", transition: "all 0.3s",
            whiteSpace: "nowrap"
          }}>
            ← New
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 70 }}>
        {/* Loading */}
        {phase === "loading" && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            minHeight: "100vh", gap: 24
          }}>
            <div style={{
              width: 56, height: 56,
              border: "2px solid rgba(232,255,71,0.2)",
              borderTop: "2px solid #e8ff47",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontFamily: "var(--font-display)",
                fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8
              }}>Processing image</p>
              <p style={{
                fontSize: 14, color: "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-body)"
              }}>Running YOLO detection + full analysis pipeline...</p>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            minHeight: "100vh", gap: 16
          }}>
            <div style={{ fontSize: 48 }}>⚠</div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#fff" }}>Analysis Failed</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{error}</p>
            <button onClick={onReset} style={{
              marginTop: 16, padding: "12px 32px",
              background: "#e8ff47", border: "none", borderRadius: 100,
              cursor: "pointer", fontFamily: "var(--font-display)",
              fontSize: 14, fontWeight: 700, color: "#000"
            }}>Try Again</button>
          </div>
        )}

        {/* 1. Detection */}
        {pi >= 1 && preview && (
          <div ref={refs.detection}>
            <ImageDetectionSection
              preview={preview}
              nodes={result?.nodes || []}
              imageSize={result?.image_size}
              active={pi >= 1}
            />
          </div>
        )}

        {/* 2. Connections */}
        {pi >= 2 && result && (
          <div ref={refs.connections}>
            <ConnectionsSection edges={result.edges} nodes={result.nodes} />
          </div>
        )}

        {/* 3. Original Graph */}
        {pi >= 3 && result && (
          <div ref={refs.graph}>
            <GraphSection nodes={result.nodes} edges={result.edges} />
          </div>
        )}

        {/* 4. Topology */}
        {pi >= 4 && result && (
          <div ref={refs.topology}>
            <TopologySection
              topology={result.topology}
              explanation={result.explanation}
              nodes={result.nodes}
              edges={result.edges}
            />
          </div>
        )}

        {/* 5. Issues */}
        {pi >= 5 && result && (
          <div ref={refs.issues}>
            <IssuesSection issues={result.issues} />
          </div>
        )}

        {/* 6. Optimized Graph */}
        {pi >= 6 && result && (
          <div ref={refs.optimized}>
            <OptimizedGraphSection
              originalNodes={result.nodes}
              originalEdges={result.edges}
              optimization={result.optimization}
              topology={result.topology}
            />
          </div>
        )}

        {/* 7. Alternative Topology */}
        {pi >= 7 && result && (
          <div ref={refs.alternative}>
            <AlternativeSection
              alternative={result.alternative}
              originalNodes={result.nodes}
            />
          </div>
        )}

        {/* 8. Scores */}
        {pi >= 8 && result && (
          <div ref={refs.scores}>
            <ScoresSection scores={result.scores} />
          </div>
        )}

        {/* 9. Security */}
        {pi >= 9 && result && (
          <div ref={refs.security}>
            <SecuritySection
              security={result.security}
              onReset={onReset}
            />
          </div>
        )}
      </div>
    </div>
  )
}