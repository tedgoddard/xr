import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene

const baseURL = "../point_e_models"

async function sleep(millis) {
  return new Promise( (resolve, reject) => {
    window.setTimeout(resolve, millis)
  })
}

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

function buildModel(model) {
  const { coords, channels } = model
  const modelGroup = new THREE.Group()
  for (let i = 0; i < coords.length; i++) {
    const boxGeom = new THREE.TetrahedronGeometry(0.005)
    const r = channels.R[i]
    const g = channels.G[i]
    const b = channels.B[i]
    const color = new THREE.Color(r, g, b)
    const material = new THREE.MeshBasicMaterial( {color } )
    const box = new THREE.Mesh(boxGeom, material)
    box.position.set(...coords[i])
    modelGroup.add(box)
  }
  return modelGroup
}

async function init() {
  const modelIndex = await (await fetch(`${baseURL}/index.json`)).json()
  await loadFloor()

  for (const name of modelIndex) {
    const modelResponse = await fetch(`${baseURL}/${name}`)
    const modelData = await modelResponse.json()
    const model = buildModel(modelData)
    scene.add(model)
    await sleep(5000)
    scene.remove(model)
  }

}

init().then()
