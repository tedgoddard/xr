import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
window.THREE = THREE

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene

const polar = new THREE.Spherical()

//We will set a_0 = 1
// const a_0 = 5.291772109E-11
const a_0 = 1
const root_pi_a_0 = Math.sqrt(Math.PI) * (a_0 ** (3/2))

function psi(r, theta, phi) {
  return (1 / (4 * Math.sqrt(2) * root_pi_a_0)) * (2 - r / a_0) * Math.exp(-r / (2 * a_0))
}

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

function partitionPoints(allPoints) {
  const size = 0.1
  const color = 0xADB1E8
  const material = { color }
  const points = []
  for (let i = 0; i < 10000; i++) {
    const point = [Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2]
console.log(point)
    polar.setFromCartesianCoords(...point)
    polar.radius *= a_0
    const amplitude = psi(polar.radius, polar.theta, polar.phi)
    console.log(polar.clone().radius, amplitude)
    if (amplitude > 0.1) {
      points.push(point)
    }
  }
  return [
    { size, material, points }
  ]
  const result = []
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
  addElectronCloud()

}

init().then()
