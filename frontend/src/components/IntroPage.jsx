import { useEffect, useRef, useState } from "react"

function NetworkCanvas() {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    let animId
    let W, H

    const nodes = []
    const NODES = 38
    const MAX_DIST = 160

    function resize() {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    for (let i = 0; i < NODES; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 1.5,
        pulse: Math.random() * Math.PI * 2
      })
    }

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)
      t += 0.01

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
        n.pulse += 0.02
      })

      // Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d  = Math.sqrt(dx*dx + dy*dy)
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.18
            ctx.beginPath()
            ctx.strokeStyle = `rgba(232,255,71,${alpha})`
            ctx.lineWidth = 0.8
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Nodes
      nodes.forEach(n => {
        const glow = Math.sin(n.pulse) * 0.5 + 0.5
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + glow * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,255,71,${0.15 + glow * 0.2})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,255,71,${0.5 + glow * 0.4})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 0,
      opacity: 0.6, pointerEvents: "none"
    }} />
  )
}

export default function IntroPage({ onEnter }) {
  const [visible, setVisible] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: "relative", minHeight: "100vh",
      background: "#000",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden"
    }}>
      <NetworkCanvas />

      {/* Radial gradient overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 30%, #000 100%)"
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        textAlign: "center", padding: "0 24px",
        maxWidth: 720
      }}>
        {/* Tag */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px",
          border: "1px solid rgba(232,255,71,0.3)",
          borderRadius: 100,
          marginBottom: 40,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#e8ff47",
            animation: "pulse 2s ease-in-out infinite"
          }} />
          <span style={{
            fontFamily: "var(--font-body)",
            fontSize: 12, letterSpacing: "0.12em",
            color: "rgba(232,255,71,0.8)",
            fontWeight: 500, textTransform: "uppercase"
          }}>AI-Powered Analysis</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(52px, 9vw, 100px)",
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          color: "#fff",
          marginBottom: 8,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}>
          Network
        </h1>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(52px, 9vw, 100px)",
          fontWeight: 800,
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          color: "#e8ff47",
          marginBottom: 40,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s",
        }}>
          Topology
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(16px, 2vw, 20px)",
          fontWeight: 300,
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.7,
          marginBottom: 64,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s",
        }}>
          Upload a network diagram. Our AI detects devices,<br />
          maps connections, and classifies your topology — instantly.
        </p>

        {/* CTA Button */}
        <button
          onClick={onEnter}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            padding: "18px 48px",
            background: btnHover ? "#e8ff47" : "transparent",
            border: "1px solid rgba(232,255,71,0.6)",
            borderRadius: 100,
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            fontSize: 16, fontWeight: 700,
            letterSpacing: "0.04em",
            color: btnHover ? "#000" : "#e8ff47",
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            opacity: visible ? 1 : 0,
            transform: visible
              ? (btnHover ? "scale(1.03)" : "scale(1)")
              : "translateY(16px)",
            animation: visible ? "glowPulse 3s ease-in-out infinite" : "none",
          }}>
          <span>Analyze Network</span>
          <span style={{ fontSize: 20 }}>→</span>
        </button>

        {/* Stats row */}
        <div style={{
          display: "flex", gap: 48, justifyContent: "center",
          marginTop: 80,
          opacity: visible ? 1 : 0,
          transition: "all 1s cubic-bezier(0.16,1,0.3,1) 0.5s",
        }}>
          {[
            { label: "Topologies", value: "6+" },
            { label: "Detection Methods", value: "3" },
            { label: "Device Classes", value: "4" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: 32, fontWeight: 800,
                color: "#e8ff47"
              }}>{s.value}</div>
              <div style={{
                fontSize: 12, color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.08em", textTransform: "uppercase",
                marginTop: 4
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom label */}
      <div style={{
        position: "fixed", bottom: 32, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2,
        fontSize: 11, letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.2)",
        textTransform: "uppercase",
        fontFamily: "var(--font-body)"
      }}>
        Scroll to explore ↓
      </div>
    </div>
  )
}