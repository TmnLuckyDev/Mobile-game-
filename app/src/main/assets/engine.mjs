// Puzzle rules are independent of the UI and Android bridge.
export const VERSION = 1
export const LEVEL_COUNT = 100
export const COLORS = ['ember', 'gold', 'jade', 'azure', 'violet', 'rose', 'copper', 'ice', 'lime', 'onyx']

export function hash(value) {
  let h = 2166136261
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

export function random(seed) {
  let n = seed >>> 0
  return () => {
    n = (n + 0x6d2b79f5) >>> 0
    let t = Math.imul(n ^ n >>> 15, n | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export const copy = board => board.map(t => [...t])
export const top = tube => tube[tube.length - 1]
export const complete = (tube, cap) => tube.length === cap && tube.every(c => c === tube[0])
export const won = (board, cap) => board.every(t => t.length === 0 || complete(t, cap))

export function amount(board, cap, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to || !board[from] || !board[to]) return 0
  const a = board[from], b = board[to]
  if (!a.length || complete(a, cap) || b.length >= cap || (b.length && top(b) !== top(a))) return 0
  let run = 1
  while (run < a.length && a[a.length - 1 - run] === top(a)) run++
  return Math.min(run, cap - b.length)
}

export function move(board, cap, from, to) {
  const count = amount(board, cap, from, to)
  if (!count) return null
  const next = copy(board)
  next[to].push(...next[from].splice(-count))
  return { board: next, count }
}

export function validBoard(board, cap, colors) {
  if (!Array.isArray(board) || !Number.isInteger(cap) || cap < 3 || cap > 5 || board.length < colors + 1 || board.length > colors + 3) return false
  const counts = Array(colors).fill(0)
  for (const tube of board) {
    if (!Array.isArray(tube) || tube.length > cap) return false
    for (const c of tube) {
      if (!Number.isInteger(c) || c < 0 || c >= colors) return false
      counts[c]++
    }
  }
  return counts.every(n => n === cap)
}

function complexity(board) {
  let boundaries = 0, mixed = 0
  for (const t of board) {
    let changes = 0
    for (let i = 1; i < t.length; i++) if (t[i] !== t[i - 1]) changes++
    boundaries += changes
    if (changes) mixed++
  }
  return boundaries * 3 + mixed * 2
}

// Each scramble operation is the exact inverse of a legal forward move.
// Therefore every generated board has a constructive proof of solvability.
export function generate(seed, colors, cap = 4, steps = 30, empties = 2) {
  const rng = random(hash(seed))
  let best = null
  for (let attempt = 0; attempt < 8; attempt++) {
    let board = Array.from({length: colors + empties}, (_, i) => i < colors ? Array(cap).fill(i) : [])
    let reverse = [], seen = new Set([JSON.stringify(board)])
    for (let step = 0; step < steps * 2; step++) {
      const choices = []
      for (let a = 0; a < board.length; a++) {
        const src = board[a]
        if (!src.length) continue
        const color = top(src)
        let run = 1
        while (run < src.length && src[src.length - 1 - run] === color) run++
        for (let b = 0; b < board.length; b++) {
          const dst = board[b]
          if (a === b || dst.length >= cap || top(dst) === color) continue
          for (let k = 1; k <= Math.min(run, cap - dst.length); k++) {
            if (k === run && k !== src.length) continue
            if (!dst.length && k === src.length) continue
            const next = copy(board)
            next[b].push(...next[a].splice(-k))
            if (amount(next, cap, b, a) !== k || seen.has(JSON.stringify(next))) continue
            choices.push({a, b, next, weight: 1 + (dst.length ? 4 : 0) + (k === 1 ? 2 : 0)})
          }
        }
      }
      if (!choices.length) break
      let pick = rng() * choices.reduce((s, x) => s + x.weight, 0)
      const choice = choices.find(x => (pick -= x.weight) < 0) || choices[choices.length-1]
      board = choice.next
      reverse.push([choice.b, choice.a])
      seen.add(JSON.stringify(board))
      const score = complexity(board)
      if (!best || score > best.score || (score === best.score && reverse.length < best.path.length)) {
        best = {board: copy(board), path: [...reverse].reverse(), score}
      }
      if (reverse.length >= steps && score >= colors * (cap - 1) * 2) break
    }
  }
  if (!best || won(best.board, cap)) throw new Error('Could not generate puzzle')
  // Randomize column order without invalidating the certified solution.
  const order = best.board.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const remap = new Map(order.map((old, i) => [old, i]))
  return {board: order.map(i => best.board[i]), path: best.path.map(([a, b]) => [remap.get(a), remap.get(b)]), cap, colors, par: best.path.length}
}

export const tutorial = () => ({board: [[0,0,1,1],[1,1,0,0],[],[]], path: [[0,2],[1,0],[2,1]], cap: 4, colors: 2, par: 3})

export function campaign(level) {
  const n = Math.max(1, Math.min(LEVEL_COUNT, Math.trunc(level)))
  if (n === 1) return tutorial()
  const colors = Math.min(9, 3 + Math.floor((n - 2) / 12))
  const cap = n >= 73 ? 5 : 4
  return generate(`campaign-v1-${n}`, colors, cap, 12 + colors * 3 + Math.floor(n / 5))
}

export function daily(date) {
  return generate(`daily-v1-${date}`, 6 + hash(date) % 3, 4, 36)
}

export const ORDER_COUNT=24
export function orders(level){
  const n=Math.max(1,Math.min(ORDER_COUNT,Math.trunc(level)))
  const colors=3+Math.floor((n-1)/6),cap=n%3===1?3:n%3===2?4:5,empties=n%2===0?1:2
  return {...generate(`orders-v1-${n}`,colors,cap,22,empties),variant:empties===1?'Single reserve':'Special mold'}
}
export function endless(level){
  const n=Math.max(1,Math.min(100000,Math.trunc(level)))
  return {...generate(`endless-v1-${n}`,5+n%5,3+n%3,30+n%12,n%4===0?1:2),variant:'Mastery'}
}

export function stars(moves, par) {
  return moves <= par ? 3 : moves <= Math.ceil(par * 1.5) ? 2 : 1
}

export function hint(board, cap, limit = 28000) {
  const seen = new Set()
  let nodes = 0
  const key = b => b.map(t => t.join(',')).sort().join('|')
  function visit(b, depth, first) {
    if (won(b, cap)) return first
    if (++nodes > limit || depth > 90) return null
    const k = key(b)
    if (seen.has(k)) return null
    seen.add(k)
    const moves = []
    for (let a = 0; a < b.length; a++) {
      const targets = new Set()
      for (let z = 0; z < b.length; z++) {
        if (!amount(b, cap, a, z)) continue
        const target = b[z].join(',')
        if (targets.has(target)) continue
        targets.add(target)
        if (!b[z].length && b[a].every(c => c === b[a][0])) continue
        const next = move(b, cap, a, z).board
        moves.push({a,z,next,rank:(b[z].length ? 10 : 0) + (complete(next[z], cap) ? 10 : 0) - complexity(next)})
      }
    }
    moves.sort((a,b) => b.rank - a.rank)
    for (const m of moves) {
      const result = visit(m.next, depth + 1, first || [m.a,m.z])
      if (result) return result
      if (nodes > limit) break
    }
    return null
  }
  return visit(board, 0, null)
}
