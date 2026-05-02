import { useState, useEffect, useRef } from "react"
import ImageDetectionSection from "./ImageDetectionSection"
import ConnectionsSection from "./ConnectionsSection"
import GraphSection from "./GraphSection"
import TopologySection from "./TopologySection"
import SecuritySection from "./SecuritySection"

export default function AnalysisPage({ result, preview, loading, error, onReset }) {
  const [phase, setPhase] = useState("loading")

  const refs = {
    detection:   useRef(),
    connections: useRef(),
    graph:       useRef(),
    topology:    useRef(),
    security:    useRef(),
  }

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useEffect(() => {
    if (loading) { setPhase("loading"); return }
    if (error)   { setPhase("error");   return }
    if (!result)  return

    // Phase sequence with auto-scroll
    setPhase("detecting")
    setTimeout(() => scrollTo(refs.detection), 300)

    setTimeout(() => {
      setPhase("connections")
      setTimeout(() => scrollTo(refs.connections), 300)
    }, 6000)

    setTimeout(() => {
      setPhase("graph")
      setTimeout(() => scrollTo(refs.graph), 300)
    }, 9500)

    setTimeout(() => {
      setPhase("topology")
      setTimeout(() => scrollTo(refs.topology), 300)
    }, 14500)

    setTimeout(() => {
      setPhase("security")
      setTimeout(() => scrollTo(refs.security), 300)
    }, 17500)

    setTimeout(() => setPhase("done"), 19500)
  }, [result, loading, error])

  const phaseIndex = {
    loading: 0, detecting: 1, connections: 2,
    graph: 3, topology: 4, security: 5, done: 6
  }
  const pi = phaseIndex[phase] || 0

  return (
    <div style={{ background: "#000", minHeight: "100vh" }}>
      {/* Fixed top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 40px",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 16, fontWeight: 700, color: "#fff"
        }}>
          NET<span style={{ color: "#e8ff47" }}>SCAN</span>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["Detecting","Connections","Graph","Topology","Security"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                onClick={() => {
                  const refKeys = ["detection","connections","graph","topology","security"]
                  if (pi > i) scrollTo(refs[refKeys[i]])
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", borderRadius: 100,
                  background: pi > i ? "rgba(232,255,71,0.15)" : "transparent",
                  border: `1px solid ${pi > i ? "rgba(232,255,71,0.4)" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 0.5s ease",
                  cursor: pi > i ? "pointer" : "default"
                }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: pi > i ? "#e8ff47" : "rgba(255,255,255,0.2)",
                  animation: pi === i + 1 ? "pulse 1s ease-in-out infinite" : "none",
                  transition: "all 0.5s ease"
                }} />
                <span style={{
                  fontSize: 11, letterSpacing: "0.06em",
                  color: pi > i ? "rgba(232,255,71,0.8)" : "rgba(255,255,255,0.25)",
                  fontFamily: "var(--font-body)", fontWeight: 500,
                  transition: "all 0.5s ease"
                }}>{label}</span>
              </div>
              {i < 4 && <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.08)" }} />}
            </div>
          ))}
        </div>

        <button onClick={onReset} style={{
          padding: "8px 20px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 100,
          color: "rgba(255,255,255,0.5)", fontSize: 12,
          fontFamily: "var(--font-body)", cursor: "pointer",
          letterSpacing: "0.04em", transition: "all 0.3s"
        }}
          onMouseEnter={e => { e.target.style.color="#fff"; e.target.style.borderColor="rgba(255,255,255,0.4)" }}
          onMouseLeave={e => { e.target.style.color="rgba(255,255,255,0.5)"; e.target.style.borderColor="rgba(255,255,255,0.15)" }}
        >
          ← New Image
        </button>
      </div>

      <div style={{ paddingTop: 80 }}>
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
              }}>Running YOLO detection + edge analysis...</p>
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

        {pi >= 2 && result && (
          <div ref={refs.connections}>
            <ConnectionsSection edges={result.edges} nodes={result.nodes} />
          </div>
        )}

        {pi >= 3 && result && (
          <div ref={refs.graph}>
            <GraphSection nodes={result.nodes} edges={result.edges} />
          </div>
        )}

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

        {pi >= 5 && result && (
          <div ref={refs.security}>
            <SecuritySection
              topology={result.topology}
              nodes={result.nodes}
              edges={result.edges}
              warnings={result.security_warnings}
              onReset={onReset}
            />
          </div>
        )}
      </div>
    </div>
  )
}