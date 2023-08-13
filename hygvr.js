import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene

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

function fixStarPosition(star) {
  const v = new THREE.Vector3(...star)
  // const d = v.length()
  // const fixed = 500 * d / (d + 1)
  // v.normalize().multiplyScalar(fixed)
  return v.toArray()
}

function partitionStars(allStars) {
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

function addMaterialStars({ size, material, stars }) {
  const starPositions = stars.map( star => [star[17], star[18], star[19]] )
  const fixedPositions = starPositions.map(fixStarPosition)
  const vertices = fixedPositions.flat()
  const sprite = new THREE.TextureLoader().load("images/disc.png")
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const pointsMaterial = new THREE.PointsMaterial({ size, sizeAttenuation: false, map: sprite, transparent: true, alphaTest: 0.5, ...material })
  const points = new THREE.Points(geometry, pointsMaterial)
  scene.add( points )
}

function addStars(stars) {
  const partitionedStars = partitionStars(stars)
  for (const materialStars of partitionedStars) {
    addMaterialStars(materialStars)
  }
}

function csvFields(text) {
  text = text.replace('\\', '\\u005c')
  text = text.replace(/"[^"]*"/g, chunk => chunk.replace(/,/, '\\u002c'))
  const fields = text.split(/,/)
  return fields
    .map(field => field.replace(/"/g, ''))
    .map(field => `"${field}"`)
    .map(JSON.parse)
}

async function fetchCSV(name) {
  const response = await fetch(name)
  const blob = await response.blob()
  const bytes = pako.inflate(await blob.arrayBuffer())
  const text = new TextDecoder("utf-8").decode(bytes)
  const lines = text.split(/[\r\n]+/)
  const data = lines.map(csvFields)
  return data
}

async function init() {
  try {
    const messier = await fetchCSV("MessierObjects.csv.gz")
    console.log("Messier", messier.map(row => [row[1], row[2]]))
  } catch (e) {
    console.error(e)
  }
  
  const hyggzResponse = await fetch("hygdata_v3.csv.gz")
  await loadFloor()

  const hyggz = await hyggzResponse.blob()
  const hygBytes = pako.inflate(await hyggz.arrayBuffer())
  const hygCSV = new TextDecoder("utf-8").decode(hygBytes)
  const hygLines = hygCSV.split("\n")
  let hyg = hygLines.map( line => line.split(",") )
  const columns = hyg.shift()
  console.log("COLUMNS", columns)
  hyg = hyg.filter( star => star[13] < 6.5 )
  const namedStars = hyg.filter( star => star[6] )
  for (const star of namedStars) {
    const starPosition = new THREE.Vector3(...fixStarPosition([star[17], star[18], star[19]]))
    const distance = starPosition.length()
    let scale = 1
    if (distance > 1) {
      scale = distance / 2
    }
    const position = starPosition.clone()
    const background = "rgba(0, 0, 0, 0)"
    const label = vrRoom.makeLabel(30, position, star[6], { background })
    label.scale.x *= scale
    label.scale.y *= scale
    label.position.y -= 0.04 * scale
    scene.add(label)
  }

  addStars(hyg)

}

init().then()
