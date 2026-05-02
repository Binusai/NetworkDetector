import { useState, useEffect, useRef } from "react"

const TYPE_COLORS = {
  computer: "#47c8ff",
  hub:      "#69e08a",
  switch:   "#ffb84d",
  router:   "#ff6b6b"
}

export default function ImageDetectionSection({ preview, nodes, imageSize, active }) {
  const [visibleNodes, setVisibleNodes] = useState([])
  const [imgDims, setImgDims] = useState(null)
  const containerRef = useRef()
  const imgRef = useRef()

  // Reveal nodes one by one over 4 seconds
  useEffect(() => {
    if (!active || !nodes.length) return
    setVisibleNodes([])
    const totalTime = 4000
    const interval  = totalTime / nodes.length

    const timers = nodes.map((_, i) =>
      setTimeout(() => setVisibleNodes(prev => [...prev, i]), 800 + i * interval)
    )
    return () => timers.forEach(clearTimeout)
  }, [active, nodes])

  // Track rendered image size for scaling bounding boxes
  function onImgLoad(e) {
    const img = e.target
    setImgDims({
      renderedW: img.offsetWidth,
      renderedH: img.offsetHeight,
      naturalW:  img.naturalWidth,
      naturalH:  img.naturalHeight,
    })
  }

  function scaleBox(box, dims) {
    if (!dims || !imageSize) return null
    const scaleX = dims.renderedW / imageSize.width
    const scaleY = dims.renderedH / imageSize.height
    return {
      left:   box[0] * scaleX,
      top:    box[1] * scaleY,
      width:  (box[2] - box[0]) * scaleX,
      height: (box[3] - box[1]) * scaleY,
    }
  }

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "100px 40px",
      borderBottom: "1px solid rgba(255,255,255,0.05)"
    }}>
      {/* Section label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 48,
        animation: "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards"
      }}>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
        <span style={{
          fontFamily: "var(--font-body)",
          fontSize: 11, letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase"
        }}>01 — Device Detection</span>
        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.2)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(32px, 5vw, 56px)",
        fontWeight: 800, letterSpacing: "-0.03em",
        color: "#fff", textAlign: "center",
        marginBottom: 16,
        animation: "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both"
      }}>
        Identifying <span style={{ color: "#e8ff47" }}>devices</span>
      </h2>
      <p style={{
        fontSize: 15, color: "rgba(255,255,255,0.35)",
        marginBottom: 56, textAlign: "center",
        fontFamily: "var(--font-body)",
        animation: "fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both"
      }}>
        YOLO model scanning for routers, switches, hubs, and computers
      </p>

      {/* Image + overlays */}
      <div ref={containerRef} style={{
        position: "relative",
        display: "inline-block",
        maxWidth: "min(900px, 90vw)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        animation: "scaleIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both"
      }}>
        <img
          ref={imgRef}
          src={preview}
          alt="network diagram"
          onLoad={onImgLoad}
          style={{
            display: "block",
            width: "100%",
            maxHeight: "70vh",
            objectFit: "contain",
            background: "#0a0a0a"
          }}
        />

        {/* Scan line animation */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to bottom, transparent 45%, rgba(232,255,71,0.04) 50%, transparent 55%)",
          animation: "scanline 2s ease-in-out 3",
          zIndex: 1
        }} />

        {/* Bounding boxes */}
        {imgDims && visibleNodes.map(i => {
          const node = nodes[i]
          if (!node) return null
          const scaled = scaleBox(node.box, imgDims)
          if (!scaled) return null
          const color = TYPE_COLORS[node.type] || "#fff"
          return (
            <div key={i} style={{
              position: "absolute",
              left: scaled.left, top: scaled.top,
              width: scaled.width, height: scaled.height,
              border: `2px solid ${color}`,
              borderRadius: 6,
              zIndex: 2,
              animation: "scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
              boxShadow: `0 0 12px ${color}44, inset 0 0 12px ${color}11`
            }}>
              {/* Label */}
              <div style={{
                position: "absolute",
                top: -28, left: -2,
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 10px",
                background: color,
                borderRadius: "4px 4px 4px 0",
                whiteSpace: "nowrap"
              }}>
                <span style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 11, fontWeight: 700,
                  color: "#000", letterSpacing: "0.04em"
                }}>
                  {i} · {node.type.toUpperCase()}
                </span>
                <span style={{
                  fontSize: 10, color: "rgba(0,0,0,0.6)",
                  fontFamily: "var(--font-body)"
                }}>
                  {(node.confidence * 100).toFixed(0)}%
                </span>
              </div>
              {/* Corner dots */}
              {[["-3px","-3px"],["auto","-3px"],["-3px","auto"],["auto","auto"]].map(([t,r],ci) => (
                <div key={ci} style={{
                  position:"absolute",
                  top: t!=="auto"?t:"auto", bottom: t==="auto"?"-3px":"auto",
                  left: r!=="auto"?"auto":"-3px", right: r!=="auto"?r:"auto",
                  width: 6, height: 6, borderRadius: "50%",
                  background: color
                }} />
              ))}
            </div>
          )
        })}
      </div>

      {/* Device pills */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10,
        justifyContent: "center", marginTop: 40, maxWidth: 640
      }}>
        {visibleNodes.map(i => {
          const node = nodes[i]
          const color = TYPE_COLORS[node?.type] || "#fff"
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px",
              background: `${color}14`,
              border: `1px solid ${color}44`,
              borderRadius: 100,
              animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards"
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
              <span style={{
                fontFamily: "var(--font-display)",
                fontSize: 12, fontWeight: 700,
                color: color, letterSpacing: "0.04em"
              }}>
                {node?.type?.toUpperCase()} #{i}
              </span>
            </div>
          )
        })}
      </div>

      {visibleNodes.length === nodes.length && nodes.length > 0 && (
        <div style={{
          marginTop: 32,
          display: "flex", alignItems: "center", gap: 8,
          animation: "fadeUp 0.6s ease forwards"
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(232,255,71,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: 10, color: "#e8ff47" }}>✓</span>
          </div>
          <span style={{
            fontSize: 13, color: "rgba(232,255,71,0.7)",
            fontFamily: "var(--font-body)", letterSpacing: "0.04em"
          }}>
            {nodes.length} device{nodes.length !== 1 ? "s" : ""} detected
          </span>
        </div>
      )}
    </section>
  )
}