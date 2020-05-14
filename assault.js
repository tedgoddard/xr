import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { Object3D } from "./js/three.module.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let rifle = null
let impact = null
const rifleFire = { }
const bullets = []
const crates = []

async function loadFloor() {
  const mesh = await vrRoom.loadTexturePanel("images/concrete.jpg")
  mesh.rotation.x = -vrRoom.halfPi
  mesh.position.y = 0.01
  const mesh1 = mesh.clone()
  const mesh2 = mesh.clone()
  mesh.position.z = -5
  mesh1.position.z = 5
  mesh2.position.z = -15
  scene.add(mesh)
  scene.add(mesh1)
  scene.add(mesh2)
}

async function loadRifle() {
  rifle = new Object3D()
  const rifleModel = await vrRoom.loadModel("models/scar.glb")
  rifle.add(rifleModel)
  vrRoom.sounds.ar15n.forEach( sound => rifle.add(sound) )
  rifleModel.rotation.y = vrRoom.halfPi
  rifleModel.rotation.x = - vrRoom.halfPi * 0.2
  rifleModel.position.y = 0.24
  rifleModel.position.z = 0.05
  // console.log(rifle)
  scene.add(rifle)
  rifle.position.set(0, 2, 0)
  rifle.scale.set(0.5, 0.5, 0.5)
}

function addCrate() {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  var cube = new THREE.Mesh(geometry, material)
  cube.position.set(-1, 1, -9)
  scene.add(cube)
  crates.push(cube)
}

function addImpact() {
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
  const material = new THREE.MeshBasicMaterial({ color: 0x000000 })
  impact = new THREE.Mesh(geometry, material)
  impact.position.set(-1, -1, -1)
  scene.add(impact)
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

function makeBullet(controller) {
  const geometry = new THREE.BoxGeometry( 0.01, 0.01, 0.1 )
  var material = new THREE.MeshBasicMaterial( {color: 0xffff00, emissive: 1.0 } )
  const bullet = new THREE.Mesh(geometry, material)
  bullet.position.copy(controller.position)
  const rotation = controller.rotation.clone()
  rotation.x -= vrRoom.halfPi * 0.2
  bullet.rotation.copy(rotation)
  const rotationMatrix = new THREE.Matrix4()
  rotationMatrix.makeRotationFromEuler(rotation)
  const velocity = new THREE.Vector3(0, 0, -0.05)
  velocity.applyMatrix4(rotationMatrix)
  bullet.userData.velocity = velocity
  scene.add(bullet)
  const sound = vrRoom.sounds.ar15n.shift()
  vrRoom.playSound(sound)
  vrRoom.sounds.ar15n.push(sound)
  return bullet
}


function moveBullet(delta, bullet) {
  let bulletVelocity = bullet.userData.velocity
  bulletVelocity.add(vrRoom.gravity)
  bulletVelocity = bulletVelocity.clone()
  bulletVelocity.multiplyScalar(delta * 4)
  const collisions = vrRoom.raycastIntersect(bullet, crates)
  if (collisions.length > 0) {
    console.log(collisions)
    impact.position.copy(collisions[0].point)
  }
  bullet.position.add(bulletVelocity)
  const bulletWorld = bullet.localToWorld(new THREE.Vector3())
  if (bulletWorld.z < -10 ) {
    scene.remove(bullet)
  }
}

async function init() {
  await loadFloor()
  await loadRifle()
  addCrate()
  addImpact()
  vrRoom.camera.position.set(0, 1.6, 5)
  vrRoom.controllerDecorator = controllerDecorator
  vrRoom.onSelect((time, controller) => {
    const now = Date.now()
    const lastPulse = rifleFire.lastPulse
    if (now - lastPulse < 100) {
      return
    }
    rifleFire.lastPulse = now
    vrRoom.hapticPulse(controller, 1.0, 50)
    const bullet = makeBullet(controller)
    bullets.push(bullet)
    if (bullets.length > 10) {
      const discard = bullets.shift()
      scene.remove(discard)
    }
  })
  vrRoom.onSqueeze((time, controller) => {
    controllerDecorator = null
    controller.add(rifle)
    rifle.position.set(0, 0, 0)
    // rifle.children[0].position.y = -2
  })
  vrRoom.onRender( (delta, frame) => {
    for (const bullet of bullets) {
      moveBullet(delta, bullet)
    }
  })
}

init().then()
