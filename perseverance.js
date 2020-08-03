import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let rover
const halfPi = vrRoom.halfPi
window.vrRoom = vrRoom
window.THREE = THREE

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

async function loadRover() {
  rover = new THREE.Object3D()
  const roverModel = await loadRoverModel()
  rover.add(roverModel)
  scene.add(rover)
  rover.position.set(0, 2, 0)
}

async function loadRoverModel() {
  const roverModel = await vrRoom.loadModel("models/perseverance.glb")
  roverModel.position.y = -2
  return roverModel
}

async function init() {

  await loadFloor()
  await loadRover()

// vrRoom.player.position.set(0, -1, 4)
// vrRoom.lookAround()
}

init().then()
