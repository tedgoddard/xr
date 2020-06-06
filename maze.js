
const lvert = [
  [0, 1, 1],
  [0, 1, 1],
  [0, 1, 1],
]

const lvertb = [
  [0, 0, 1],
  [1, 0, 1],
  [0, 0, 1],
]

const rvert = [
  [1, 1, 0],
  [1, 1, 0],
  [1, 1, 0],
]

const rvertb = [
  [1, 0, 0],
  [1, 0, 1],
  [1, 0, 0],
]

const uhorz = [
  [0, 0, 0],
  [1, 1, 1],
  [1, 1, 1],
]

const uhorzb = [
  [0, 1, 0],
  [0, 0, 0],
  [1, 1, 1],
]

const dhorz = [
  [1, 1, 1],
  [1, 1, 1],
  [0, 0, 0],
]

const dhorzb = [
  [1, 1, 1],
  [0, 0, 0],
  [0, 1, 0],
]

function equal(a, b) {
  const height = a.length
  const width = a[0].length
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      if (a[j][i] != b[j][i]) {
        return false
      }
    }
  }
  return true
}

function randomInt(max) {
  return Math.floor(max * Math.random())
}

function adjacents(maze, a, options = { }) {
  const v = options.void || 0
  const [i, j] = a
  const row = maze[j]
  const urow = maze[j - 1] || []
  const drow = maze[j + 1] || []
  const result = []
  if (urow[i] == 0) {
    result.push([i, j - 1])
  }
  if (row[i - 1] == 0) {
    result.push([i - 1, j])
  }
  if (row[i + 1] == 0) {
    result.push([i + 1, j])
  }
  if (drow[i] == 0) {
    result.push([i, j + 1])
  }
  return result
}

function neighbors(maze, i, j, options = { }) {
  const v = options.void || 0
  const row = maze[j]
  const urow = maze[j - 1] || []
  const drow = maze[j + 1] || []
  return [
    [urow[i - 1] || v, urow[i] || v, urow[i + 1] || v],
    [row[i - 1] || v, row[i] || v, row[i + 1] || v],
    [drow[i - 1] || v, drow[i] || v, drow[i + 1] || v],
  ]
}

function apply(maze, deformation) {
  const { i, j, array } = deformation
  maze[j - 1].splice(i - 1, 3, ...array[0])
  maze[j].splice(i - 1, 3, ...array[1])
  maze[j + 1].splice(i - 1, 3, ...array[2])
}

function safeDeform(maze, i, j) {
  const cell = maze[j][i]
  if (cell == 0) {
    return null
  }
  const neigh = neighbors(maze, i, j)
  if (!neigh) {
    return null
  }
  let array = null
  if (equal(neigh, lvert)) {
    array = lvertb
  } else if (equal(neigh, rvert)) {
    array = rvertb
  } else if (equal(neigh, uhorz)) {
    array = uhorzb
  } else if (equal(neigh, dhorz)) {
    array = dhorzb
  }
  if (!array) {
    return null
  }
  return { i, j, array }
}

function deform(maze) {
  const height = maze.length
  const width = maze[0].length
  const deformations = []
  for (let j = 1; j < height - 1; j++) {
    const row = maze[j]
    for (let i = 1; i < width - 1; i++) {
      const deformation = safeDeform(maze, i, j)
      if (deformation) {
        deformations.push(deformation)
      }
    }
  }
  const deformation = deformations[randomInt(deformations.length)]
  apply(maze, deformation)
}

export function worm(width, height, options) {
  const { steps, style } = options || { steps: 10 }
  const maze = pipe(width, height, options)
  for (let i = 0; i < steps; i++) {
    deform(maze)
  }
  return maze
}

export function dump(maze) {
  const prettyCell = cell => cell == 0 ? " " : (cell == 1 ? "*" : cell)
  const prettyRow = row => row.map(prettyCell).join("")
  return maze.map(prettyRow).join("\n")
}

function styledCell(width, height, options, i, j) {
  const style = options.style || "|"

  if (["|", "+"].includes(style)) {
    const middle = Math.floor(width / 2)
    if (i == middle) {
      return 0
    }
  }

  if (["-", "+"].includes(style)) {
    const middle = Math.floor(height / 2)
    if (j == middle) {
      return 0
    }
  }

  return 1
}

function pipe(width, height, options) {
  const result = []
  for (let i = 0; i < height; i++) {
    const row = []
    for (let j = 0; j < width; j++) {
      const cell = styledCell(width, height, options, i, j)
      row.push(cell)
    }
    result.push(row)
  }
  return result
}

export function simple(width, height, density = 0.2) {
  const result = []
  for (let i = 0; i < height; i++) {
    const row = []
    for (let j = 0; j < width; j++) {
      row.push(Math.floor(Math.random() + density))
    }
    result.push(row)
  }
  return result
}

function pathStep(maze, a, b, paths) {
  for (const key in paths) {
    const p = paths[key]
    const [end] = p.slice(-1)
    const open = adjacents(maze, end)
    for (const n of open) {
      const nKey = JSON.stringify(n)
      const existing = paths[nKey]
      if (!existing) {
        const newPath = [...p, n]
        paths[nKey] = newPath
      }
    }
  }
}

export function path(maze, a, b, paths) {
  if (!paths) {
    paths = { }
    paths[JSON.stringify(a)] = [a]
  }
  let morePaths = true
  while (morePaths) {
    const pathsBefore = Object.keys(paths).length
    pathStep(maze, a, b, paths)
    const pathsAfter = Object.keys(paths).length
    morePaths = pathsBefore != pathsAfter
  }
  return paths[JSON.stringify(b)]
}
