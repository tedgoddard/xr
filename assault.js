import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { Object3D } from "./js/three.module.js"
import { Maze } from "./maze.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let rifle = null
let impacts = []
const rifleFire = { }
const bullets = []
const crates = []

const mazeGenerator = new Maze()

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
  const geometry = new THREE.BoxGeometry(1, 2, 1)
  const material = new THREE.MeshLambertMaterial({ color: 0x666666 })
  var cube = new THREE.Mesh(geometry, material)
  cube.position.set(x, y, z)
  scene.add(cube)
  const box = new THREE.Box3()
  box.setFromObject(cube)
  box.expandByScalar(0.09)
  cube.userData.boundingBox = box
  return cube
}

function addCrates() {
  const maze = mazeGenerator.simple(10, 10, 0.3)
  for (let y = 0; y < maze.length; y++) {
    const row = maze[y]
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]
      if (cell) {
        crates.push(makeCrate(x - 5, 1, -y))
      }
    }
  }
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
  for (let i = 0; i < 100; i++) {
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
  var material = new THREE.MeshBasicMaterial( {color: 0x666600, emissive: 0.6 } )
  const bullet = new THREE.Mesh(geometry, material)
  const barrel = rifle.userData.barrel
  bullet.position.copy(barrel.localToWorld(new THREE.Vector3()))
  const direction = new THREE.Vector3()
  barrel.getWorldDirection(direction)
  const velocity = direction.multiplyScalar(0.03)
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
    const collision = collisions[0]
    if (bulletVelocity.length() > collision.distance) {
      const impact = impacts.shift()
      impact.position.copy(collision.point)
      impacts.push(impact)
    }
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
  vrRoom.player.position.set(0, 0, 3)
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
    if (controller.children.length > 0) {
      controller.children[0].visible = false
    }
  })
  vrRoom.onRender( (delta, frame) => {
    for (const bullet of bullets) {
      moveBullet(delta, bullet)
    }
  })
  vrRoom.addMoveListener( delta => {
    const position = vrRoom.player.position.clone()
    position.add(delta)
    for (const crate of crates) {
      const boundingBox = crate.userData.boundingBox
      if (boundingBox.containsPoint(position)) {
        return new THREE.Vector3()
      }
    }
    return delta
  })
}

init().then()
