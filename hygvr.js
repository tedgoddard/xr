import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene

window.vrRoom = vrRoom

const { twoPi, halfPi } = vrRoom
const celestialSphere = new THREE.Object3D()
scene.add(celestialSphere)
const hygSphere = new THREE.Object3D()
celestialSphere.add(hygSphere)
hygSphere.rotateX(-halfPi)
hygSphere.rotateZ(-halfPi)
const radecSphere = new THREE.Object3D()
celestialSphere.add(radecSphere)
// radecSphere.rotateX(-Math.PI / 2)

// const latitude = 51.0447
const latitude = 90
const latitudeRad = latitude * twoPi / 360

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
  hygSphere.add( points )
}

function addStars(stars) {
  const partitionedStars = partitionStars(stars)
  for (const materialStars of partitionedStars) {
    addMaterialStars(materialStars)
  }
}

function dececimalRaDec(RAh, RAm, DECsgn, DECd, DECm) {
  const ra = parseInt(RAh) + parseFloat(RAm) / 60
  const dec = parseInt(`${DECsgn}1`) * (parseInt(DECd) + parseInt(DECm) / 60)
  return { ra, dec }
}

function radianRaDec(RAh, RAm, DECsgn, DECd, DECm) {
  let { ra, dec } = dececimalRaDec(RAh, RAm, DECsgn, DECd, DECm)
  ra = ra * twoPi / 24
  dec = dec * twoPi / 360
  return { ra, dec }
}

function applyRaDec(position, distance, ra, dec) {
  position.setFromSphericalCoords(distance, halfPi - dec, ra)
}

function messierDecoder(fields) {
  const [
    num, name, type, constellation,
    RAh, RAm, Dsgn, Dd, Dm,
    magnitude, info, distance
  ] = fields
  // const ra = (parseInt(RAh) + parseFloat(RAm) / 60) * twoPi / 24
  // const dec = parseInt(`${Ds}1`) * (parseInt(Dd) + parseInt(Dm) / 60) * twoPi / 360
  const { ra, dec } = radianRaDec(RAh, RAm, Dsgn, Dd, Dm)
  return { m: `M${num.trim()}`, name, type, ra, dec, }
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

function addCelestialGrid() {
  const position = new THREE.Vector3()
  const background = "rgba(0, 0, 0, 0)"
  for (let rah = 0; rah < 8; rah += 1) {
    for (let decd = -0; decd < 90; decd += 10) {
      const { ra, dec } = radianRaDec(rah, 0, '+', decd, 0)
      // position.setFromSphericalCoords(1.0, halfPi - dec, ra)
      applyRaDec(position, 1.0, ra, dec)
      const label = vrRoom.makeLabel(30, position, `${rah}h ${decd}\u00b0`, { background })
      radecSphere.add(label)
    }
  }
}

async function init() {
  // celestialSphere.rotateX(-latitudeRad)
  setInterval(() => {
    // celestialSphere.rotateX(0.001)
    // hygSphere.rotateZ(0.001)
  }, 100)
  // addCelestialGrid()
  try {
    // https://www.nexstarsite.com/Book/DSO.htm
    const messierFields = await fetchCSV("MessierObjects.csv.gz")
    const messierColumns = messierFields.shift()
    console.log("COLUMNS", messierColumns)
    const messier = messierFields.map(messierDecoder)
    console.log({messier})
    const position = new THREE.Vector3()
    const background = "rgba(0, 0, 0, 0)"
    for (const object of messier) {
      const { m, ra, dec } = object
      // const distance = 20.0
      const distance = 60.0
      const scale = distance / 2
      // position.setFromSphericalCoords(distance, halfPi - dec, ra)
      applyRaDec(position, distance, ra, dec)
      const label = vrRoom.makeLabel(30, position, m, { background })
      label.scale.x *= scale
      label.scale.y *= scale
      radecSphere.add(label)
    }
    const caldwell = await fetchCSV("CaldwellObjects.csv.gz")
    const caldwellColumns = caldwell.shift()
    console.log("Caldwell columns", caldwellColumns)
    const herschel = await fetchCSV("Herschel400.csv.gz")
    const herschelColumns = herschel.shift()
    console.log("Herschel columns", herschelColumns)
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
  // const namedStars = hyg.filter( star => star[6] == 'Polaris' )
  const namedRaDec = namedStars.map(row => ({ name: row[6], ra: row[7], dec: row[8],rar: row[23], decr: row[24] }))
  console.log({ namedRaDec })
  const background = "rgba(0, 0, 0, 0)"
  for (const star of namedStars) {
    const starPosition = new THREE.Vector3(...fixStarPosition([star[17], star[18], star[19]]))
    const distance = starPosition.length()
    let scale = 1
    if (distance > 1) {
      scale = distance / 2
    }
    const position = starPosition.clone()
    const label = vrRoom.makeLabel(30, position, star[6], { background })
    label.scale.x *= scale
    label.scale.y *= scale
    label.position.y -= 0.04 * scale
    hygSphere.add(label)
  }

  addStars(hyg)

}

init().then()
