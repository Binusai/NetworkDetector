/**
 * Topology-aware layout engine for alternative topology graphs.
 * ALL node ids are treated as strings throughout to avoid JS object key coercion bugs.
 */

const W = 700, H = 520, CX = W / 2, CY = H / 2

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function ringLayout(nodes) {
  const r = Math.min(CX, CY) - 80
  const pos = {}
  nodes.forEach((nd, i) => {
    pos[String(nd.id)] = polar(CX, CY, r, (360 / nodes.length) * i)
  })
  return pos
}

function starLayout(nodes) {
  const pos = {}
  const center =
    nodes.find(n => n.type === "router") ||
    nodes.find(n => n.type === "switch") ||
    nodes.find(n => n.type === "hub") ||
    nodes[0]

  pos[String(center.id)] = { x: CX, y: CY }
  const leaves = nodes.filter(n => String(n.id) !== String(center.id))
  const r = Math.min(CX, CY) - 70
  leaves.forEach((nd, i) => {
    pos[String(nd.id)] = polar(CX, CY, r, (360 / leaves.length) * i)
  })
  return pos
}

function treeLayout(nodes, edges) {
  const pos = {}
  if (!nodes.length) return pos

  // ── Adjacency map (all string keys) ──
  const adj = {}
  nodes.forEach(n => { adj[String(n.id)] = [] })
    ; (edges || []).forEach(e => {
      const s = String(e.source)
      const t = String(e.target)
      if (adj[s] !== undefined && !adj[s].includes(t)) adj[s].push(t)
      if (adj[t] !== undefined && !adj[t].includes(s)) adj[t].push(s)
    })

  // ── Root selection: router > switch > hub > highest degree ──
  const byType = type => nodes.filter(n => n.type === type)
  let rootNode =
    byType("router")[0] ||
    byType("switch")[0] ||
    byType("hub")[0] ||
    nodes.reduce((best, n) =>
      (adj[String(n.id)]?.length || 0) > (adj[String(best.id)]?.length || 0) ? n : best,
      nodes[0]
    )
  const rootId = String(rootNode.id)

  // ── BFS to assign levels and parent→children order ──
  const level = {}      // id → level number
  const children = {}   // id → [child ids]
  const visited = new Set()

  level[rootId] = 0
  children[rootId] = []
  visited.add(rootId)
  const queue = [rootId]
  let maxLevel = 0

  while (queue.length) {
    const cur = queue.shift()
    const lvl = level[cur]
    for (const nb of (adj[cur] || [])) {
      if (!visited.has(nb)) {
        visited.add(nb)
        level[nb] = lvl + 1
        maxLevel = Math.max(maxLevel, lvl + 1)
        children[cur].push(nb)
        children[nb] = []
        queue.push(nb)
      }
    }
  }

  // ── Place any disconnected nodes by device type ──
  const TYPE_LEVEL = { router: 0, switch: 1, hub: 1, computer: 2 }
  nodes.forEach(n => {
    const nid = String(n.id)
    if (visited.has(nid)) return

    const lvl = TYPE_LEVEL[n.type] ?? maxLevel + 1
    level[nid] = lvl
    children[nid] = []
    maxLevel = Math.max(maxLevel, lvl)

    // Attach to a visited node one level above so subtree widths include it
    const parent = nodes.find(
      p => visited.has(String(p.id)) && level[String(p.id)] === lvl - 1
    )
    if (parent) {
      children[String(parent.id)].push(nid)
    } else {
      // No parent found — attach to root as a direct child
      children[rootId].push(nid)
      level[nid] = level[rootId] + 1
      maxLevel = Math.max(maxLevel, level[nid])
    }
    visited.add(nid)
  })

  // ── Subtree width (leaf = 1, internal = sum of children widths) ──
  const width = {}
  function calcWidth(id) {
    if (!children[id] || children[id].length === 0) {
      width[id] = 1; return 1
    }
    let w = 0
    for (const c of children[id]) w += calcWidth(c)
    width[id] = w
    return w
  }
  calcWidth(rootId)

  // ── Assign (x, y) using proportional horizontal slicing ──
  const totalLevels = maxLevel + 1
  const vertStep = (H - 120) / Math.max(totalLevels, 1)

  function place(id, x0, x1, lvl) {
    pos[id] = { x: (x0 + x1) / 2 + (lvl * 1.5), y: 60 + lvl * vertStep }
    const ch = children[id] || []
    if (!ch.length) return
    const totalW = ch.reduce((s, c) => s + (width[c] || 1), 0)
    let cur = x0
    for (const c of ch) {
      const cw = (width[c] || 1) / totalW * (x1 - x0)
      place(c, cur, cur + cw, lvl + 1)
      cur += cw
    }
  }

  place(rootId, 50, W - 50, 0)

  // Safety fallback
  nodes.forEach(n => {
    const nid = String(n.id)
    if (!pos[nid]) pos[nid] = { x: CX, y: H - 50 }
  })

  return pos
}

export function computeTopologyLayout(nodes, edges, topology) {
  if (!nodes?.length) return {}
  const topo = (topology || "").toLowerCase()

  if (topo.includes("ring")) return ringLayout(nodes)
  if (topo.includes("bus")) return ringLayout(nodes)
  if (topo.includes("star")) return starLayout(nodes)
  if (topo.includes("tree")) return treeLayout(nodes, edges)
  if (topo.includes("mesh")) return treeLayout(nodes, edges)

  // Fallback: use tree if any infrastructure node exists
  const hasInfra = nodes.some(n => ["switch", "hub", "router"].includes(n.type))
  return hasInfra ? treeLayout(nodes, edges) : ringLayout(nodes)
}