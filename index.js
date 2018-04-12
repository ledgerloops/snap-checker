const NUM_NODES=100
const NUM_EDGES=150
const EPSILON=1

function randomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

let edges = []
let loops = []
for (let i = 0; i < NUM_EDGES; i++) {
  const from = randomInt(NUM_NODES)
  if (!edges[from]) {
    edges[from] = []
  }
  const max = 1 + randomInt(100)
  let to
  do {
    to = randomInt(NUM_NODES)
  } while((to == from) || edges[from].map(edge => edge.to).indexOf(to) !== -1)

  edges[from].push({
    min: -1 - randomInt(100),
    max,
    from,
    to,
    current: randomInt(max)
  })
}

function normalizeLoop(loop) {
  // console.log('normalizeLoop', loop)
  let best = loop[0]
  let bestPos = 0
  for (let i = 1; i < loop.length; i ++) {
    if (loop[i] < best) {
      best = loop[i]
      bestPos = i
    }
    // console.log(i, best, bestPos)
  }
  // console.log(loop.slice(bestPos))
  // console.log(loop.slice(0, bestPos))
  return loop.slice(bestPos).concat(loop.slice(0, bestPos))
}

function isSame (loop1, loop2) {
  if (loop1.length !== loop2.length) {
    return false
  }
  for (let i = 0; i < loop1.length; i++) {
    if (loop1[i] !== loop2[i]) {
      return false
    }
  }
  return true
}

function reportLoop(loop) {
  // console.log('reportLoop', loop)
  for (let i = 0; i < loops.length; i++) {
    if (isSame(loops[i], loop)) {
      return
    }
  }
  loops.push(loop)
}

function walk(current, path /*, global: loops */) {
  // console.log('walk', path, current)
  for (let search = 0; search < path.length; search++) {
    if (path[search] === current) {
      reportLoop(normalizeLoop(path.slice(search)))
      return
    }
  }
  if (!edges[current]) { // dead end
    return
  }
  path.push(current)
  for (let next = 0; next < edges[current].length; next++) {
    walk(edges[current][next].to, path)
  }
  path.pop()
}

console.log(edges)
for (let i = 0; i < NUM_NODES; i++) {
  let path = []
  let loops = []
  walk(i, path, loops)
}
console.log('loops', loops.length)

function getEdge(from, to) {
  for (let i = 0; i < edges[from].length; i++) {
    if (edges[from][i].to === to) {
      return edges[from][i]
    }
  }
}

function changeCurrent(from, to, change) {
  for (let i = 0; i < edges[from].length; i++) {
    if (edges[from][i].to === to) {
      edges[from][i].current += change
      console.log('changing!', from, i, edges[from][i], change)
      return
    }
  }
  console.log('oops not found!')
}

function getLoopEdges(loop) {
  let edges = []
  for (let i = 1; i < loop.length; i++) {
    edges.push(getEdge(loop[i-1], loop[i]))
  }
  edges.push(getEdge(loop[loop.length - 1], loop[0]))
  return edges
}

function sweep() {
  let totalChange = 0
  for (let i = 0; i < loops.length; i++) {
    const edges = getLoopEdges(loops[i]).sort((a, b) => (a.current - b.current))
    // console.log('got edges', loops[i], edges)
    let balanceToChange = - edges[Math.floor(edges.length / 2)].current
    // console.log({ balanceToChange })
    for (let j = 0; j < edges.length; j++) {
      if (edges[j].current + balanceToChange <= edges[j].min) {
        // console.log('too low', balanceToChange, edges[j])
        balanceToChange = edges[j].min - edges[j].current + EPSILON
      }
      if (edges[j].current + balanceToChange >= edges[j].max) {
        // console.log('too high', balanceToChange, edges[j])
        balanceToChange = edges[j].max - edges[j].current - EPSILON
      }
    }
    if (balanceToChange === 0) {
      // console.log('alas! no wiggle room')
      continue
    }
    for (let j = 0; j < edges.length; j++) {
      changeCurrent(edges[j].from, edges[j].to, balanceToChange)
      totalChange += balanceToChange
    }
  }
  return totalChange
}

let changed = 0
do {
  changed = sweep()
  console.log('sweep!', changed)
} while(changed)
