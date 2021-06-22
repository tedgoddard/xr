import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { TypedArrayUtils } from './jsm/utils/TypedArrayUtils.js'

const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, gravity: false })
const scene = vrRoom.scene
const player = vrRoom.player

const panoURLBase = "https://cdn.youriguide.com"
const panoInfoBase = "https://cdn.youriguide.com"
const address = "2640_5_ave_nw_calgary_ab"

const grey = 0x555555
const red = 0xFF0000
const panoSize = 10

let panoTree = null
let indexedPanos = []
let currentMarker = -1
let currentPano = null
const panos = { }

const nearThreshold = 0.00001

const floorPanoCount = floor => floor.layout?.panos?.length
const buildingFloor = (id, floor) => ({ ...floor, id: `${id}.${floor.id}`})

const to3D = pos => [pos[0], 0, pos[1]]
const vMinus = (u, v) => ([u[0] - v[0], u[1] - v[1], u[2] - v[2]])
const vTimes = (v, a) => ([v[0] * a, v[1] * a, v[2] * a])

function setPano(pano) {
  const { id, sphereHash, rot, position } = pano
  const marker = pano.marker

  if (pano.skybox) {
    pano.skybox.visible = true
    return
  }
  if (currentPano == sphereHash) {
    return
  }

  const shortHash = sphereHash.slice(0, 8)
  const names = [0, 2, 4, 5, 1, 3].map(n => `${n}.${shortHash}`)

  const urls = names.map(name => `${panoURLBase}/${address}/p/${id}/${name}`)
  const materials = urls.map((url) => {
    const texture = new THREE.TextureLoader().load(url)
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  })

  const skybox = new THREE.Mesh( new THREE.BoxBufferGeometry(panoSize, panoSize, panoSize), materials )
  pano.skybox = skybox
  scene.add(skybox)
  skybox.rotation.y = rot
  skybox.position.set(...position)
}

function centroid(vectors) {
  const length = vectors.length
  let sum = [0, 0, 0]
  for (const v of vectors) {
    sum[0] += v[0]
    sum[1] += v[1]
    sum[2] += v[2]
  }
  return vTimes(sum, 1 / length)
}

function sq(a) {
  return Math.pow(a, 2)
}

const displacement = function (a, b) {
  return sq(a[0] - b[0]) + sq(a[1] - b[1]) + sq(a[2] - b[2])
}

function hasPosition(object, coords) {
  const { position } = object
  const result = displacement(position, coords) < nearThreshold
  return result
}

function initKdTree(objects) {
  const coords = objects.map(({position}) => position)
  const coordsFloat32 = Float32Array.from(coords.flat())
  const kdtree = new TypedArrayUtils.Kdtree(coordsFloat32, displacement, 3)
  const indexed = []
  for (let i = 0; i < coordsFloat32.length; i += 3) {
    const coord = coordsFloat32.slice(i, i + 3)
    const located = objects.find(o => hasPosition(o, coord))
    indexed.push(located)
  }
  return { indexed, kdtree }
}

const stepSize = 0.25
const movePlayer = {
  w: () => { player.position.x -= stepSize },
  a: () => { player.position.z += stepSize },
  s: () => { player.position.x += stepSize },
  d: () => { player.position.z -= stepSize },
  q: () => { player.position.y -= stepSize },
  e: () => { player.position.y += stepSize },
}

document.onkeydown = (event) => {
  movePlayer[event.key]()
}

const updateNearestMarker = () => {
  if (!panoTree) {
    return
  }
  const playerPosition = vrRoom.player.position.toArray()
  const count = 1
  const maxDistance = 10
  const nearMarkers = panoTree.nearest(playerPosition, count, maxDistance)
  if (nearMarkers.length == 0) {
    return
  }
  for (const pano of indexedPanos) {
    const skybox = pano.skybox ?? {}
    skybox.visible = false
  }
  for (const hit of nearMarkers) {
    const pos = hit[0].pos
    const pano = indexedPanos[pos]
    const skybox = pano.skybox ?? {}
    skybox.visible = true
    if (currentMarker == pos) {
      break
    }
    currentMarker = pos
    setPano(pano)
    const marker = pano.marker
    marker.material.color.setHex(red)
    setTimeout(() => {
      marker.material.color.setHex(grey)
    }, 5000)
  }
}

vrRoom.onRender( (delta, frame, renderer) => {
  updateNearestMarker()
})

async function init() {
  const url = `${panoInfoBase}/${address}/`
  const htmlString = await (await fetch(url)).text()
  const parser = new DOMParser()
  const htmlDOM = parser.parseFromString(htmlString, "text/html")
  const scripts = [...htmlDOM.getElementsByTagName("script")]
  const scriptTexts = scripts.map(script => script.innerText.trim())
  const dataScript = scriptTexts.find(script => script.startsWith("var moduleName = 'appLayout'"))
  const lineMatcher = /app.constant\('([^']*)',(.*)\);$/
  const dataItems = dataScript.split("\n").map(line => line.match(lineMatcher) ?? [])
  const sceneData = {}
  for (const item of dataItems) {
    try {
      sceneData[item[1]] = JSON.parse(item[2])
    } catch { }
  }
  const buildings = sceneData.viewObject.dataV2.buildings
  const allFloors = buildings.flatMap(({ id, floors }) => floors.map(floor => buildingFloor(id, floor)))
  allFloors.sort((a, b) => floorPanoCount(b) - floorPanoCount(a))
  const bestFloor = allFloors[0]
  const panos = bestFloor.layout?.panos
  const poss = panos.map(({ pos }) => to3D(pos))
  const floorCenter = centroid(poss)

  for (const pano of panos) {
    const panoPos = vTimes(vMinus(to3D(pano.pos), floorCenter), 1/1000)
    pano.position = panoPos
    const markerMaterial = new THREE.MeshBasicMaterial( {color: grey, emissive: 1.0 } )
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), markerMaterial)
    marker.position.set(...panoPos)
    scene.add(marker)
    pano.marker = marker
  }
  const treeInfo = initKdTree(panos)
  panoTree = treeInfo.kdtree
  indexedPanos = treeInfo.indexed

  setPano(panos[12])  
}

init().then()
