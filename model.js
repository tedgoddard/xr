import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let model
window.vrRoom = vrRoom
window.THREE = THREE

async function loadModel() {
  model = new THREE.Object3D()
  const modelName = document.location.search.substring(1)
  const glbModel = await vrRoom.loadModel(`models/${modelName}`)
  model.add(glbModel)
  scene.add(model)
  model.position.set(0, 2, 0)
}

async function init() {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  scene.add(directionalLight)
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  await loadModel()
}

init().then()
