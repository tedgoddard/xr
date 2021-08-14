import * as THREE from './js/three.module.js'
import { GUI } from './jsm/libs/dat.gui.module.js'
import { VRRoom } from "./vrroom.js"
import { setup, iterate } from "./lanczos.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let graphV = null
let graphP = null

let niter = 50
let d = 2
let l = 20
let psiLen = l**d

const gui = new GUI()
const guiParams = {
  E: 2,
  iterations: 30,
  subdivisions: 20, //not working, l is stride everywhere
  smooth: true,
}
function update() {
  guiParams.subdivisions = Math.floor(guiParams.subdivisions)
  l = guiParams.subdivisions
  niter = guiParams.iterations
  psiLen = l**d
  console.log(guiParams)
  setup({ d, niter, l, st: guiParams.E})
  draw()
}

gui.add(guiParams, 'E', 0, 20).onChange( () => { 
  guiParams.E = Math.floor(guiParams.E)
  update()
})
gui.add(guiParams, 'iterations', 1, 200).onChange( () => { 
  guiParams.iterations = Math.floor(guiParams.iterations)
  update()
})
gui.add(guiParams, 'smooth', false, true).onChange(update)
gui.add(guiParams, 'subdivisions', 1, 200).onChange(update)

function arrayIndex(length, stride, x, y) {
  const xIndex = Math.floor(x * (stride - 1))
  const yIndex = Math.floor(Math.floor(y * (length - 1)) / (stride)) * (stride)
  return xIndex + yIndex
}

function unitCoords(length, stride, index) {
  const yIndex = Math.floor(index / stride)
  const xIndex = index - (yIndex * stride)
  const x = xIndex / stride
  const y = yIndex / stride
  return { x, y }
}

function nparametricFunction(options) {
  const { f, scale = 1 } = options
  return (x, y, target) => {
    let z = f[Math.floor(x * (l - 1)) + Math.floor(Math.floor(y * (psiLen - 1)) / l) * l] ?? 0
    z *= scale
    x = 5 * x - 2.5
    y = 5 * y - 2.5
    const coords = [x, y, z]
    target.set(...coords)
  }
}

function clamp(x, max, x0) {
  return x >= max ? x0 : x
}
function parametricFunction(options) {
  const { f, scale = 1, smooth = false } = options
  return (x, y, target) => {
    const index = arrayIndex(psiLen, l, x, y)
    let z = f[index] ?? 0
    // z = f[Math.floor(x * (l - 1)) + Math.floor(Math.floor(y * (psiLen - 1)) / l) * l] ?? 0

    if (smooth) {
      const z00 = z
      const index01 = clamp(index + l, psiLen, index) 
      const index10 = clamp(index + 1, psiLen, index)
      const index11 = clamp(index + 1 + l, psiLen, index)
      const z01 = f[index01]
      const z10 = f[index10]
      const z11 = f[index11]
      const xy00 = unitCoords(psiLen, l, index)
      // const xy01 = unitCoords(psiLen, l, index01)
      // const xy10 = unitCoords(psiLen, l, index10)
      // const xy11 = unitCoords(psiLen, l, index11)
      // const xr = ((x - xy00.x) - (x / l)) * l // * l //  / (xy10.x - xy00.x)
      const xr = (x - xy00.x) * l - x
      // const xr = (x - xy00.x) * l // * l //  / (xy10.x - xy00.x)
      const yr = (y - xy00.y) * l
      const zxd = z10 - z00
      const zyd = z01 - z00
      const zxyd = z11 - z00 - zxd - zyd
      z =  z00 + xr * zxd + yr * zyd  + xr * yr * zxyd //+ (1/l)*x
      // z = xy00.x - x // this means that unitCoords.x is incorrect
    }
    if (isNaN(z)) {
      console.log("NaN", {z, x, y, index,})
    }
    z = isNaN(z) ? 0 : z
    z *= scale
    x = 5 * x - 2.5
    y = 5 * y - 2.5
    const coords = [x, y, z]
    target.set(...coords)
  }
}

function draw() {
  const { psi, eigs, vpot } = iterate()

  scene.remove(graphP)
  scene.remove(graphV)
  const geometryV = new THREE.ParametricGeometry( parametricFunction({ f: vpot, smooth: true }), 100, 100, true );
  const materialV = new THREE.MeshPhongMaterial({ color: 0x444444, side: THREE.DoubleSide })
  graphV = new THREE.Mesh(geometryV, materialV)
  graphV.rotation.x = -vrRoom.halfPi
  graphV.position.y = -2
  scene.add(graphV)

  const geometryP = new THREE.ParametricGeometry( parametricFunction({ f: psi, scale: 5, smooth: guiParams.smooth }), 100, 100, true );
  const materialP = new THREE.MeshStandardMaterial({ color: 0x993333, roughness: 0.5,flatShading: true, metalness: 0.5, opacity: 1.0, transparent: false, side: THREE.DoubleSide })
  graphP = new THREE.Mesh(geometryP, materialP)
  graphP.rotation.x = -vrRoom.halfPi
  scene.add(graphP)
}

setup({ d, niter, l })
draw()

