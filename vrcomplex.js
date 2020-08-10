import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const mathFieldSpan = document.getElementById('math-field')

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let graph
let fn
const halfPi = vrRoom.halfPi

const mathQuill = MathQuill.getInterface(2)

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

function number(a) {
  if (typeof a == "number") {
    return { x: a, y: 0 }
  }
  return a
}

function sum(a, b) {
  a = number(a)
  b = number(b)
  return { x: a.x + b.x, y: a.y + b.y}
}

function product(a, b) {
  a = number(a)
  b = number(b)
  return { x: a.x * b.x - a.y * b.y, y: a.x * b.y + b.x * a.y }
}

function power(a, b) {
  a = number(a)
  // b = complex(b)
  // integer powers only right now
  let result = { x: 1, y: 0 }
  for (let i = 0; i < b; i++) {
    result = product(result, a)
  }
  return result
}

function inverse(a) {
  const d = (a.x * a.x + a.y * a.y)
  return { x: a.x / d, y: -a.y / d }
}

function negate(a) {
  return { x: -a.x, y: -a.y }
}

function frac(a, b) {
  return product(a, inverse(b))
}

const operations = {
  isNumber: x => x.x != null && x.y != null,
  number,
  sum,
  product,
  power,
  inverse,
  negate,
  frac,
}

const mathField = mathQuill.MathField(mathFieldSpan, {
  spaceBehavesLikeTab: true,
  handlers: {
    edit: async function() {
      const expression = mathField.latex()
      const constants = { }
      const options = { operations }
      fn = evaluatex(expression, constants, options)
      drawGraph()
    }
  }
})
window.mathField = mathField

function parametricFunction(x, y, target) {
  x = 5 * x - 2.5
  y = 5 * y - 2.5
  const w = fn({ x: { x, y } })
  let z = Math.sqrt(w.x * w.x + w.y * w.y)
  z = z < 100 ? z : 100
  const coords = isNaN(z) ? [0, 0, 0] : [x, y, z]
  target.set(...coords)
}

function drawGraph() {
  if (graph) {
    scene.remove(graph)
  }
  const geometry = new THREE.ParametricGeometry( parametricFunction, 100, 100, true );
  const material = new THREE.MeshBasicMaterial({ vertexColors: THREE.VertexColors, side: THREE.DoubleSide })
  graph = new THREE.Mesh(geometry, material)
  graph.rotation.x = -vrRoom.halfPi

  const faceIndices = [ 'a', 'b', 'c', 'd' ];
  for (let i = 0; i < geometry.vertices.length; i++ ) {
    const point = geometry.vertices[i]
    const color = new THREE.Color(0x0000ff)
    const { x, y } = point
    const w = fn({ x: { x, y } })
    const n = Math.sqrt(w.x * w.x + w.y * w.y)
    let sign = Math.sign(Math.asin(w.y  / n))
    sign = sign ? sign : 1
    const theta = sign * Math.acos(w.x  / n)
    color.setHSL( theta / vrRoom.twoPi, 1, 0.5 )
    geometry.colors[i] = color
  }

  for ( let i = 0; i < geometry.faces.length; i++ ) {
    const face = geometry.faces[i]
    const numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4
    for( let j = 0; j < numberOfSides; j++ )  {
      const vertexIndex = face[ faceIndices[ j ] ];
      face.vertexColors[ j ] = geometry.colors[ vertexIndex ]
    }
  }

  graph.geometry.computeFaceNormals();
  graph.geometry.computeVertexNormals();
  graph.geometry.normalsNeedUpdate = true;
  graph.geometry.verticesNeedUpdate = true;

  scene.add(graph)
}

async function init() {
  await loadFloor()
}

init().then()
