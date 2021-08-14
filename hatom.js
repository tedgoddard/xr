import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
window.THREE = THREE

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene
const showProbability = false

const polar = new THREE.Spherical()

//We will set a_0 = 1
// const a_0 = 5.291772109E-11
const a_0 = 1
const root_pi_a_0 = Math.sqrt(Math.PI) * (a_0 ** (3/2))
let threshold = 0.03
let ceiling = 0.3
let width = 10

function fpsi_2s_0(r, theta, phi) {
  return (1 / (4 * Math.sqrt(2) * root_pi_a_0)) * (2 - r / a_0) * Math.exp(-r / (2 * a_0))
}
threshold = 0.0005
width = 12

function fpsi_2p_0(r, theta, phi) {
  return (1 / (4 * Math.sqrt(2) * root_pi_a_0)) * (r / a_0) * Math.exp(-r / (2 * a_0)) * Math.cos(theta)
}
threshold = 0.003
width = 9

function fpsi_3d_2(r, theta, phi) {
  return (1 / (162 * root_pi_a_0)) * (r * r / a_0 * a_0) * Math.exp(-r / (3 * a_0)) * (Math.sin(theta * Math.exp(i * 2 * phi)) ** 2)
}

function fpsi_3d_0(r, theta, phi) {
  return (1 / (81 * Math.sqrt(6) * root_pi_a_0)) * (r * r / a_0 * a_0) * Math.exp(-r / (3 * a_0)) * (3 * (Math.cos(theta) ** 2) - 1)
}

// threshold = 0.002
threshold = 0.008
ceiling = 0.02
width = 20

function psi_2p_1_r(r, theta, phi) {
  return (1 / (8 * root_pi_a_0)) * (r / a_0) * Math.exp(-r / (2 * a_0)) * Math.sin(theta)
}

function psi_2p_1_eitheta(r, theta, phi) {
  return phi
}


// threshold = 0.01


const psi_2s_0 = {
  r: (r, theta, phi) => (1 / (4 * Math.sqrt(2) * root_pi_a_0)) * (2 - r / a_0) * Math.exp(-r / (2 * a_0)),
  theta: (r, theta, phi) => vrRoom.twoPi,
  threshold: 0.022,
  ceiling: 0.07,
  width: 14
}

const psi_2p_0 = {
  r: (r, theta, phi) => (1 / (4 * Math.sqrt(2) * root_pi_a_0)) * (r / a_0) * Math.exp(-r / (2 * a_0)) * Math.cos(theta),
  theta: (r, theta, phi) => vrRoom.twoPi,
  threshold: 0.0005,
  ceiling: 0.02,
  width: 20
}


const psi_2p_1 = {
  r: (r, theta, phi) => (1 / (8 * root_pi_a_0)) * (r / a_0) * Math.exp(-r / (2 * a_0)) * Math.sin(theta),
  theta: (r, theta, phi) => phi,
  threshold: 0.008,
  ceiling: 0.02,
  width: 20
}

const psi_3p_0 = {
  r: (r, theta, phi) => (Math.sqrt(2) / (81 * root_pi_a_0)) * (6 - r / a_0) * (r / a_0) * Math.exp(-r / (3 * a_0)) * (Math.sin(theta)),
  theta: (r, theta, phi) => vrRoom.twoPi,
  threshold: 0.0025,
  ceiling: 0.02,
  width: 30
}

const psi_3p_1 = {
  r: (r, theta, phi) => (Math.sqrt(2) / (81 * root_pi_a_0)) * (6 - r / a_0) * (r / a_0) * Math.exp(-r / (3 * a_0)) * (Math.cos(theta)),
  theta: (r, theta, phi) => phi,
  threshold: 0.0025,
  ceiling: 0.02,
  width: 36
}

const psi_3d_0 = {
  r: (r, theta, phi) => (1 / (81 * Math.sqrt(6) * root_pi_a_0)) * (r * r / a_0 * a_0) * Math.exp(-r / (3 * a_0)) * (3 * (Math.cos(theta) ** 2) - 1),
  theta: (r, theta, phi) => vrRoom.twoPi,
  threshold: 0.0025,
  ceiling: 0.02,
  width: 20
}

const psi_3d_2 = {
  r: (r, theta, phi) => (1 / (162 * root_pi_a_0)) * (r * r / a_0 * a_0) * Math.exp(-r / (3 * a_0)) * (Math.sin(theta)) ** 2,
  theta: (r, theta, phi) => 2 * phi,
  threshold: 0.003,
  ceiling: 0.02,
  width: 26
}

const psi = psi_3p_1

window.vrRoom = vrRoom
const spectra = {
  O: 0xADB1E8,
  B: 0xC1CCDC,
  A: 0xCBCDC8,
  F: 0xDECD95,
  G: 0xCEC86E,
  K: 0xDCAC6B,
  M: 0x8D2E2F,
}

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

function fixPosition(point) {
  return point
  const v = new THREE.Vector3(...point)
  // const d = v.length()
  // const fixed = 500 * d / (d + 1)
  // v.normalize().multiplyScalar(fixed)
  return v.toArray()
}

function randInt(width) {
  // return Math.random() * 4 - 2
  return Math.random() * width - width / 2
}

function createPoints() {

  const size = 0.1
  const ampSpan = ceiling - threshold
  const pointsVertices = []
  const pointsColors = []
  const pointsSizes = []
  width = psi.width

  const color = new THREE.Color()
  for (let i = 0; i < width * 10000; i++) {
    const point = [randInt(width), randInt(width), randInt(width)]
    // const point = [randInt(width), -Math.abs(randInt(width)), randInt(width)]
// console.log(point)
    polar.setFromCartesianCoords(...point)
    polar.radius *= a_0
    if (showProbability) {
      const amplitude = (psi(polar.radius, polar.theta, polar.phi))**2
    // console.log(polar.clone().radius, amplitude)
      if (amplitude > threshold) {
        pointsVertices.push(...point)
        pointsColors.push(0.8, 0.4, 0.4)
        pointsSizes.push(0.2)
      }
    } else {
      const r = psi.r(polar.radius, polar.theta, polar.phi)
      const amplitude = Math.abs(r)
      if (amplitude < psi.threshold) {
        continue
      }
      const eitheta = psi.theta(polar.radius, polar.theta, polar.phi)
      const ampClamp = Math.min(Math.max(amplitude, psi.threshold), psi.ceiling) - psi.threshold
      color.setHSL( eitheta / vrRoom.twoPi, 1, 0.75 * ampClamp / ampSpan)
      pointsVertices.push(...point)
      pointsColors.push(color.r, color.g, color.b)
      pointsSizes.push(0.2)
// console.log(ampIndex)
      // if (amplitude > threshold) {
      //   result[colorIndex].points.push(point)
      // }
    }
  }
  const pointsGeometry = new THREE.BufferGeometry()
  // const discSprite = new THREE.TextureLoader().load("images/disc.png")
  const particleShaderMaterial = vrRoom.particleShaderMaterial
  // particleShaderMaterial.uniforms.pointTexture.value = discSprite
// console.log(pointsVertices)
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointsVertices, 3).setUsage(THREE.DynamicDrawUsage))
  pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointsColors, 3).setUsage(THREE.DynamicDrawUsage))
  pointsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(pointsSizes, 1))
  const pointsSystem = new THREE.Points(pointsGeometry, particleShaderMaterial)
  // pointsSystem.rotation.z = -vrRoom.halfPi
  // pointsSystem.position.y = 2
  // pointsSystem.position.x = 0

  scene.add(pointsSystem)

}




function partitionPoints(allPoints) {
  const size = 0.1
  const ampSpan = ceiling - threshold
  const result = []
  const colorPoints = { }
  for (let colorIndex = 0; colorIndex < 10; colorIndex++) {
    for (let ampIndex = 0; ampIndex < 10; ampIndex++) {
      const color = new THREE.Color()
      const material = { color }
      color.setHSL( colorIndex / 9, 1, 0.75 * (ampIndex + 1) / 10)
      const points = []
      colorPoints[`${colorIndex},${ampIndex}`] = points
      result.push({ size, material, points })
    }
  }
  if (showProbability) {
    const color = 0xADB1E8
    const material = { color }
    result.push({ size, material, points: [] })
  } else {
    // for (let i = 0; i < 10; i++) {
    //   const color = new THREE.Color()
    //   color.setHSL( i / 9, 1, 0.5 )
    //   const material = { color }
    //   result.push({ size, material, points: [] })
    // }
  }
  for (let i = 0; i < 100000; i++) {
    const point = [randInt(width), randInt(width), randInt(width)]
    // const point = [randInt(width), -Math.abs(randInt(width)), randInt(width)]
// console.log(point)
    polar.setFromCartesianCoords(...point)
    polar.radius *= a_0
    if (showProbability) {
      const amplitude = (psi(polar.radius, polar.theta, polar.phi))**2
    // console.log(polar.clone().radius, amplitude)
      if (amplitude > threshold) {
        result[0].points.push(point)
      }
    } else {
      const r = psi_2p_1_r(polar.radius, polar.theta, polar.phi)
      const amplitude = Math.abs(r)
      const eitheta = psi_2p_1_eitheta(polar.radius, polar.theta, polar.phi)
      const colorIndex = Math.floor(10 * eitheta / vrRoom.twoPi)
      const ampClamp = Math.min(Math.max(amplitude, threshold), ceiling) - threshold
      const ampIndex = Math.floor(9 * ampClamp / ampSpan)
// console.log(ampIndex)
      // if (amplitude > threshold) {
      //   result[colorIndex].points.push(point)
      // }
      colorPoints[`${colorIndex},${ampIndex}`].push(point)
    }
  }
// console.log(result)
  return result

  const magnitudes = [-100, -2, 0, 1, 2, 3, 7]
  const magScale = [0.9, 0.8, 0.6, 0.4, 0.2, 0.1]
  const sizeScale = [10, 9, 8, 7, 6, 5]
  for (const spectralClass in spectra) {
    for (let i = 0; i < magnitudes.length - 1; i++) {
      const size = sizeScale[i]
      const lowMag = magnitudes[i]
      const highMag = magnitudes[i + 1]
      const hasMagnitude = star => (lowMag < star[13]) && (star[13] <= highMag)
      const hasColor = star => star[15].startsWith(spectralClass)
      const hasColorMagnitude = star => hasColor(star) && hasMagnitude(star)
      const stars = allStars.filter(hasColorMagnitude)
      const spectraColor = new THREE.Color(spectra[spectralClass])
      const { h, s, l } = spectraColor.getHSL({ })
      spectraColor.setHSL(h, 1, magScale[i])
      const color = spectraColor.getHex()
      const material = { color }
      result.push({ size, material, stars })
    }
  }

  return result
}

function addMaterialPoints({ size, material, points }) {
  const fixedPositions = points.map(fixPosition)
  const vertices = fixedPositions.flat()
  const sprite = new THREE.TextureLoader().load("images/disc.png")
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const pointsMaterial = new THREE.PointsMaterial({ size, sizeAttenuation: true, map: sprite, transparent: true, alphaTest: 0.5, ...material })
  const threePoints = new THREE.Points(geometry, pointsMaterial)
  scene.add(threePoints)
}

function addElectronCloud() {
  const allPoints = []
  const partitionedPoints = partitionPoints(allPoints)
  for (const materialPoints of partitionedPoints) {
    addMaterialPoints(materialPoints)
  }
}

async function init() {

  await loadFloor()
    // addElectronCloud()
  createPoints()

// vrRoom.player.position.set(0, -1, 4)
// vrRoom.lookAround()
}

init().then()
