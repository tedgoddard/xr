import * as THREE from './js/three.module.js'
import { GUI } from './jsm/libs/dat.gui.module.js'
import { VRRoom } from "./vrroom.js"
import { setup, iterate } from "./lanczos.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let graphV = null
let graphP = null
let pointsSystemP = null
let pointsSystemV = null
let shimmering = false

let niter = 50
let d = 2
let l = 20
let psiLen = l**d
let squared = false
let seed = null
let dotThreshMin = 0
let dotThreshMax = 20

let psi = null
let eigs = null
let vpot = null
let escale = null
let vpotScaled = null
let psi2 = null

window.diamond = (x, y) => Math.abs(x - 0.5) + Math.abs(y - 0.5)
window.circle = (x, y) => (Math.sqrt((x - 0.5)**2 + (y - 0.5)**2))

// (circle(x, y) - 0.3)**10
// 100 - (20*circle(x, y) - 10)**2
// 24 - 200*(circle(x, y) - 0.3)**2
// Math.exp((circle(x, y) - 0.3)**2)

//Dog dish
// 30*Math.exp(-80*(circle(x, y) - 0.2)**2)

const gui = new GUI()
const guiParams = {
  d: 3,
  E: 2,
  iterations: 30,
  subdivisions: 20,
  "^2": false,
  smooth: true,
  // V: "((x - 0.5)**2 + (y - 0.5)**2) * 50",
  V: "((2*x - 1)**2 + (2*y - 1)**2 + (2*z - 1)**2) * 50",
  "show V": true,
  shuffle: () => {
    seed = parseInt(`${Math.random()}`.slice(2))
    update()
   },
   shimmer: () => {
    shimmering = !shimmering
    shimmer()
   },
   dotThreshMin: 0,
   dotThreshMax: 20,
   dotThreshScaleV: 2,
   dotThreshScaleP: 2
}

const bump = (x) => x + 1.0 * (Math.random() - 0.5)
const redBlue = (x) => x < 0 ? [0.6, 0.6, 0.9] : [0.9, 0.6, 0.6]

function update() {
  guiParams.subdivisions = Math.floor(guiParams.subdivisions)
  d = guiParams.d
  l = guiParams.subdivisions
  niter = guiParams.iterations
  psiLen = l**d
  squared = guiParams['^2']
  dotThreshMin = guiParams.dotThreshMin
  dotThreshMax = guiParams.dotThreshMax
  const vpotF = new Function('x', 'y', 'z', `return ${guiParams.V}`)
  console.log("guiParams", guiParams)
  setup({ d, niter, l, st: guiParams.E, vpotF, seed})
  generate()
  draw()
}

gui.add(guiParams, 'd', 2, 3, 1).onFinishChange(update)
gui.add(guiParams, 'E', 0, 20, 1).onFinishChange(update)
gui.add(guiParams, 'iterations', 1, 200, 1).onFinishChange(update)
gui.add(guiParams, 'smooth', false, true).onChange(update)
gui.add(guiParams, '^2', false, true).onChange(update)
gui.add(guiParams, 'V', '((x - 0.5)**2 + (y - 0.5)**2) * 50').onFinishChange(update)
gui.add(guiParams, 'show V', false, true).onChange(update)
gui.add(guiParams, 'subdivisions', 1, 200, 1).onFinishChange(update)
gui.add(guiParams, 'shuffle')
gui.add(guiParams, 'shimmer')
gui.add(guiParams, 'dotThreshMin', 0, 30, 0.1).onFinishChange(update)
gui.add(guiParams, 'dotThreshMax', 0, 30, 0.1).onFinishChange(update)
gui.add(guiParams, 'dotThreshScaleV', 0, 10, 0.1).onFinishChange(update)
gui.add(guiParams, 'dotThreshScaleP', 0, 10, 0.1).onFinishChange(update)

function arrayIndex(length, stride, x, y) {
  const xIndex = Math.floor(x * (stride - 1))
  const yIndex = Math.floor(Math.floor(y * (length - 1)) / (stride)) * (stride)
  return xIndex + yIndex
}

function arrayIndex3D(length, stride, x, y, z) {
  const square = stride * stride
  const xIndex = Math.floor(x * (stride - 1))
  const yIndex = Math.floor(Math.floor(y * (length - 1)) / (stride)) * (stride)
  const ZIndex = Math.floor(Math.floor(y * (length - 1)) / (stride)) * (stride)
  return xIndex + yIndex + zIndex
}

function unitCoords(length, stride, index) {
  const yIndex = Math.floor(index / stride)
  const xIndex = index - (yIndex * stride)
  const x = xIndex / stride
  const y = yIndex / stride
  return { x, y }
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

function normalize(psi) {
  const psi2 = psi.square()
  const norm = psi2.norm()
  return psi2.multiplyScalar(1 / norm)
}

function generate() {
  const result = iterate()
  psi = result.psi
  eigs = result.eigs
  vpot = result.vpot
  escale = result.escale
  vpotScaled = vpot.addScalar(-2 * d).multiplyScalar(0.1 / escale)
  psi2 = squared ? normalize(psi) : psi
}

function shimmer() {
  if (shimmering) {
    setTimeout(shimmer, 50)
  }
  draw()
}

function pointCloud(pointValues, { scale, dotThreshScale, colorFunction }) {
  const pointsVertices = []
  const pointsColors = []
  const pointsSizes = []

  const ll = l**2
  for (let j = 0; j < psiLen; j++) { // do j=1,n
    //ToDo make function to obtain coords
    const x = 1 + j % l
    const y = Math.floor(1 + (j % ll) / l) // 1+mod(j-1,ll)/l
    const z = Math.floor(1 + j / ll)

    //could take a gradient across the box to distribute the points "smoothly"
    const value = pointValues[j]
    const color = colorFunction(value)
    const amplitude = Math.abs(value) * 10**dotThreshScale

    if (amplitude < dotThreshMin) {
      continue
    }
    if (amplitude > dotThreshMax) {
      continue
    }

    const dotCount = Math.min(amplitude**2, 10)

    for (let k = 0; k < dotCount; k++) {
      pointsVertices.push(scale * bump(x) / l, scale * bump(y) / l, scale * bump(z) / l)
      pointsSizes.push(0.01 * amplitude)
      pointsColors.push(...color)
    }
  }

  const pointsGeometry = new THREE.BufferGeometry()
  const particleShaderMaterial = vrRoom.particleShaderMaterial
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointsVertices, 3).setUsage(THREE.DynamicDrawUsage))
  pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointsColors, 3).setUsage(THREE.DynamicDrawUsage))
  pointsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(pointsSizes, 1))
  return new THREE.Points(pointsGeometry, particleShaderMaterial)
}

function draw() {
  const scale = 5

  scene.remove(graphP)
  scene.remove(graphV)
  scene.remove(pointsSystemP)
  scene.remove(pointsSystemV)
  graphP?.geometry.dispose()
  graphV?.geometry.dispose()
  pointsSystemP?.geometry.dispose()
  pointsSystemV?.geometry.dispose()

  if (d == 2) {
    const geometryP = new THREE.ParametricGeometry( parametricFunction({ f: psi2, scale, smooth: guiParams.smooth }), 100, 100, true );
    const materialP = new THREE.MeshStandardMaterial({ color: 0x993333, roughness: 0.5, flatShading: true, metalness: 0.5, opacity: 1.0, transparent: false, side: THREE.DoubleSide })
    graphP = new THREE.Mesh(geometryP, materialP)
    graphP.rotation.x = -vrRoom.halfPi
    scene.add(graphP)

    if (guiParams["show V"]) {
      const geometryV = new THREE.ParametricGeometry( parametricFunction({ f: vpotScaled, smooth: true }), 100, 100, true );
      const materialV = new THREE.MeshPhongMaterial({ color: 0x444444, side: THREE.DoubleSide })
      graphV = new THREE.Mesh(geometryV, materialV)
      graphV.rotation.x = -vrRoom.halfPi
      graphV.position.y = -2
      scene.add(graphV)
    }
  }
  if (d == 3) {
    if (guiParams["show V"]) {
      const colorFunction = x => [0.6, 0.6, 0.6]
      const dotThreshScale = guiParams.dotThreshScaleV
      pointsSystemV = pointCloud(vpotScaled, { scale, dotThreshScale, colorFunction })
      pointsSystemV.position.x = -2
      scene.add(pointsSystemV)
    }
    const colorFunction = redBlue
    const dotThreshScale = guiParams.dotThreshScaleP
    pointsSystemP = pointCloud(psi2, { scale, dotThreshScale, colorFunction })
    pointsSystemP.position.x = -2
    scene.add(pointsSystemP)
  }
}

update()
