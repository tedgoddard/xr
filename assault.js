import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { Object3D } from "./js/three.module.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let rifle = null
let impacts = []
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
  const barrel = new Object3D()
  const rifleModel = await vrRoom.loadModel("models/scar.glb")
  rifle.add(rifleModel)
  rifleModel.add(barrel)
  vrRoom.sounds.ar15n.forEach( sound => rifle.add(sound) )
  rifleModel.rotation.y = vrRoom.halfPi
  rifleModel.rotation.x = - vrRoom.halfPi * 0.2
  barrel.rotation.copy(rifleModel.rotation)
  barrel.position.y = -0.1
  rifleModel.position.y = 0.24
  rifleModel.position.z = 0.05
  // console.log(rifle)
  scene.add(rifle)
  rifle.position.set(0, 2, 0)
  rifle.scale.set(0.5, 0.5, 0.5)
  rifle.userData.barrel = barrel
}

function makeCrate(x, y, z) {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshLambertMaterial({ color: 0x666666 })
  var cube = new THREE.Mesh(geometry, material)
  cube.position.set(x, y, z)
  scene.add(cube)
  return cube
}

function addCrates() {
  crates.push(makeCrate(-1, 1, -9))
  crates.push(makeCrate(2, 1, -3))
}

function makeImpact() {
  const geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01)
  const material = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const impact = new THREE.Mesh(geometry, material)
  impact.position.set(-1, -1, -1)
  scene.add(impact)
  return impact
}

function addImpacts() {
  for (let i = 0; i < 10; i++) {
    impacts.push(makeImpact())
  }
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
  var material = new THREE.MeshBasicMaterial( {color: 0x660000, emissive: 0.6 } )
  const bullet = new THREE.Mesh(geometry, material)
  const barrel = rifle.userData.barrel
  bullet.position.copy(barrel.localToWorld(new THREE.Vector3()))
  const direction = new THREE.Vector3()
  barrel.getWorldDirection(direction)
  const velocity = direction.multiplyScalar(0.01)
  bullet.userData.velocity = velocity
  console.log(velocity)
  scene.add(bullet)
  const rotationMatrix = new THREE.Matrix4()
  const eye = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  rotationMatrix.lookAt(eye, direction, up)
  bullet.rotation.setFromRotationMatrix(rotationMatrix)
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
    const impact = impacts.shift()
    impact.position.copy(collisions[0].point)
    impacts.push(impact)
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
  addCrates()
  addImpacts()
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
    vrRoom.controllerDecorator = null
    controller.add(rifle)
    rifle.position.set(0, 0, 0)
    rifle.rotation.y = - vrRoom.halfPi * 0.05
    rifle.rotation.x = - vrRoom.halfPi * 0.1
  })
  vrRoom.onRender( (delta, frame) => {
    for (const bullet of bullets) {
      moveBullet(delta, bullet)
    }
  })
}

init().then()
