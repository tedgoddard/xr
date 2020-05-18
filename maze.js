
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

function neighbors(maze, i, j) {
  const row = maze[j]
  const urow = maze[j - 1]
  const drow = maze[j + 1]
  if (!urow || !drow) {
    return null
  }
  return [
    [urow[i - 1], urow[i], urow[i + 1]],
    [row[i - 1], row[i], row[i + 1]],
    [drow[i - 1], drow[i], drow[i + 1]],
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
  for (let j = 0; j < height; j++) {
    const row = maze[j]
    for (let i = 0; i < width; i++) {
      // const cell = row[i]
      const deformation = safeDeform(maze, i, j)
      if (deformation) {
        deformations.push(deformation)
      }
    }
  }
  const deformation = deformations[randomInt(deformations.length)]
  apply(maze, deformation)
}

export function worm(width, height, steps = 10) {
  const maze = pipe(width, height)
  for (let i = 0; i < steps; i++) {
    deform(maze)
  }
  return maze
}

function dump(maze) {
  const prettyCell = cell => cell == 0 ? "*" : " "
  const prettyRow = row => row.map(prettyCell).join("")
  return maze.map(prettyRow).join("\n")
}

function pipe(width, height, options = { }) {
  const result = []
  const direction = options.horizontal ? height : width
  const middle = Math.floor(direction / 2)
  for (let i = 0; i < height; i++) {
    const row = []
    for (let j = 0; j < width; j++) {
      const check = options.horizontal ? i : j
      const cell = (check != middle) + 0
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
