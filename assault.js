import { VRRoom, logFlash } from "./vrroom.js"
import { Object3D } from "./js/three.module.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let rifle = null
const rifleFire = { }

async function loadFloor() {
  const mesh = await vrRoom.loadTexturePanel("images/concrete.jpg")
  mesh.rotation.x = -vrRoom.halfPi
  mesh.position.y = 0.01
  const mesh1 = mesh.clone()
  mesh.position.z = -5
  mesh1.position.z = 5
  scene.add(mesh)
  scene.add(mesh1)
}

async function loadRifle() {
  rifle = new Object3D()
  const rifleModel = await vrRoom.loadModel("models/scar.glb")
  rifle.add(rifleModel)
  rifleModel.rotation.y = vrRoom.halfPi
  rifleModel.rotation.x = - vrRoom.halfPi * 0.2
  rifleModel.position.y = 0.24
  rifleModel.position.z = 0.05
  // console.log(rifle)
  scene.add(rifle)
  rifle.position.set(0, 2, 0)
  rifle.scale.set(0.5, 0.5, 0.5)
}

function controllerDecorator(time, controller) {
  if (!rifle) {
    return
  }
  if (controller.userData.name == "controller2") {
    return
  }
  rifle.position.copy(controller.position)
  rifle.rotation.copy(controller.rotation)
}

async function init() {
  await loadFloor()
  await loadRifle()
  vrRoom.camera.position.set(0, 1.6, 5)
  vrRoom.controllerDecorator = controllerDecorator
  vrRoom.onSelect((time, controller) => {
    const now = Date.now()
    const lastPulse = rifleFire.lastPulse
    if (now - lastPulse < 200) {
      return
    }
    rifleFire.lastPulse = now
    vrRoom.hapticPulse(controller, 1.0, 50)
  })
  setInterval(() => {
    vrRoom.hapticPulse()
  }, 20000)
}

init().then()
