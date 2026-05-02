import { useRef, useState, useEffect } from "react"

function NetworkCanvas() {
  const canvasRef = useRef()
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    let animId
    let W, H
    const nodes = []
    const NODES = 28

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    for (let i = 0; i < NODES; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
        n.pulse += 0.015
      })
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = Math.sqrt(dx*dx + dy*dy)
          if (d < 140) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(255,255,255,${(1-d/140)*0.06})`
            ctx.lineWidth = 0.6
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        const g = Math.sin(n.pulse) * 0.5 + 0.5
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.15 + g * 0.25})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none" }} />
}

export default function UploadPage({ onUpload }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => { setTimeout(() => setVisible(true), 50) }, [])

  function handleFile(file) {
    if (file && file.type.startsWith("image/")) onUpload(file)
  }

  return (
    <div style={{
      position: "relative", minHeight: "100vh",
      background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden"
    }}>
      <NetworkCanvas />
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255,255,255,0.02) 0%, #000 100%)"
      }} />

      {/* Header */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 40px",
        borderBottom: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 16, fontWeight: 700,
          letterSpacing: "-0.02em", color: "#fff"
        }}>
          NET<span style={{ color: "#e8ff47" }}>SCAN</span>
        </div>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.15em", textTransform: "uppercase"
        }}>
          Topology Detector
        </div>
      </div>

      {/* Main Upload Zone */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: 680,
        padding: "0 24px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: 12, letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase", marginBottom: 20
          }}>Step 01 — Upload</p>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 5vw, 60px)",
            fontWeight: 800, letterSpacing: "-0.03em",
            color: "#fff", lineHeight: 1
          }}>
            Drop your<br />
            <span style={{ color: "#e8ff47" }}>network diagram</span>
          </h2>
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => inputRef.current.click()}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          style={{
            position: "relative",
            border: `1px solid ${dragging || hover ? "rgba(232,255,71,0.6)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 24,
            padding: "80px 40px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "rgba(232,255,71,0.04)" : hover ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)",
            transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
            backdropFilter: "blur(8px)"
          }}
        >
          {/* Animated corners */}
          {[["0","0","borderTop","borderLeft"],
            ["0","auto","borderTop","borderRight"],
            ["auto","0","borderBottom","borderLeft"],
            ["auto","auto","borderBottom","borderRight"]
          ].map(([t,r,b1,b2],i) => (
            <div key={i} style={{
              position:"absolute",
              top: t!=="auto" ? -1 : "auto",
              right: r!=="auto" ? -1 : "auto",
              bottom: r==="auto"&&t==="auto" ? -1 : (t==="auto"&&r!=="auto" ? -1 : "auto"),
              left: r==="0"||r===0 ? -1 : (r==="auto"&&(i===0||i===2) ? -1 : "auto"),
              width: 20, height: 20,
              borderColor: "#e8ff47",
              borderStyle: "solid",
              borderWidth: 0,
              [b1+"Width"]: "2px",
              [b2+"Width"]: "2px",
              borderRadius: i===0?"4px 0 0 0":i===1?"0 4px 0 0":i===2?"0 0 0 4px":"0 0 4px 0",
              opacity: hover||dragging ? 1 : 0,
              transition: "opacity 0.3s ease"
            }} />
          ))}

          <div style={{
            fontSize: 48, marginBottom: 20,
            filter: hover ? "brightness(1.3)" : "brightness(0.6)",
            transition: "filter 0.3s"
          }}>⬆</div>

          <p style={{
            fontFamily: "var(--font-display)",
            fontSize: 22, fontWeight: 700,
            color: hover ? "#fff" : "rgba(255,255,255,0.6)",
            marginBottom: 8, transition: "color 0.3s"
          }}>
            {dragging ? "Release to analyze" : "Click or drag & drop"}
          </p>
          <p style={{
            fontSize: 13, color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.05em"
          }}>
            JPG · PNG · WEBP · BMP
          </p>

          <div style={{
            display: "inline-block",
            marginTop: 32,
            padding: "12px 36px",
            background: hover ? "#e8ff47" : "transparent",
            border: "1px solid rgba(232,255,71,0.4)",
            borderRadius: 100,
            fontFamily: "var(--font-display)",
            fontSize: 14, fontWeight: 700,
            letterSpacing: "0.04em",
            color: hover ? "#000" : "#e8ff47",
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)"
          }}>
            Choose File
          </div>

          <input ref={inputRef} type="file" accept="image/*"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        {/* Supported topologies */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          justifyContent: "center", marginTop: 32
        }}>
          {["Star","Bus","Ring","Mesh","Tree","Hybrid"].map(t => (
            <span key={t} style={{
              padding: "4px 14px",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 100,
              fontSize: 12, color: "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-body)"
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}