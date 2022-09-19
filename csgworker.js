import "./js/jscad-modeling.min.js"
const Modeling = jscadModeling
const booleans = Modeling.booleans

let totalCSG = null

function init(arg) {
  totalCSG = arg
}

function csgOp(op, arg, retain) {
  const csgResult = op(totalCSG, arg)
  if (retain) {
    totalCSG = csgResult
  }
  return csgResult
}

function union(arg, retain) {
  if (!arg) {
    return
  }
  return csgOp(booleans.union, arg, retain)
}

function subtract(arg, retain) {
  if (!arg) {
    return
  }
  return csgOp(booleans.subtract, arg, retain)
}

const ops = {
  init,
  subtract,
  union
}

onmessage = event => {
  const { op, arg, retain } = event.data
  const geometry = ops[op](arg, retain)
  postMessage({ geometry })
}
