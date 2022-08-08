import { VRRoom, ensureHelvetiker, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { Object3D } from "./js/three.module.js"
import { elements, table } from './elements.js'

const halfPi = Math.PI / 2
const vrRoom = new VRRoom()
window.vrRoom = vrRoom
const scene = vrRoom.scene
let rifle = null
let impacts = []
const rifleFire = { }
const bullets = []
const crates = []
const tiles = []
const tileObjects = { }
let crateTree = null
let creature = null
let maze = null
let sight = null
let sightOffset = new THREE.Vector3()
let sightScale = 1
let sightRTT = null
let sightCamera = null
// let gripper = null

const sightRenderer = new THREE.WebGLRenderer({ antialias: true })
sightRenderer.setPixelRatio(1)
sightRenderer.setSize(256, 256)
const halfGravity = vrRoom.gravity.clone().multiplyScalar(0.5)

const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
const redMaterial = new THREE.MeshBasicMaterial({ color: 0x660000 })
const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x006600 })
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x000066 })
const yellowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 })

async function loadFloor() {
  const mesh = await vrRoom.loadTexturePanel("images/concrete.jpg")
  mesh.rotation.x = -halfPi
  mesh.position.y = 0.01
  for (let j = -2; j < 1; j++) {
    for (let i = -1; i < 2; i++) {
      const floor = mesh.clone()
      floor.position.x = i * 10
      floor.position.z = j * 10
      scene.add(floor)
    }
  }
}

async function loadSCAR(rifle, barrel) {
  const rifleModel = await vrRoom.loadModel("models/scar.glb")
  rifleModel.rotation.y = halfPi
  rifleModel.rotation.x = - halfPi * 0.2
  rifleModel.position.y = 0.11
  rifleModel.position.z = 0.019
  rifleModel.scale.set(0.5, 0.5, 0.5)
  sightOffset.y = 0.1368
  sightOffset.z = -0.056
  sightScale = new THREE.Vector3(0.5, 0.5, 0.5)
  barrel.position.y = -0.1
  vrRoom.sounds.ar15n.forEach( sound => rifle.add(sound) )
  rifle.userData.sounds = vrRoom.sounds.ar15n
  return rifleModel
}

async function loadVintorez(rifle, barrel) {
  const rifleModel = await vrRoom.loadModel("models/vss-vintorez.glb")
  rifleModel.rotation.y = halfPi
  rifleModel.rotation.x = - halfPi * 0.2
  rifleModel.position.y = -0.0819
  rifleModel.position.z = -0.12
  rifleModel.scale.set(0.1, 0.1, 0.1)
  sightOffset.y = 0.1368
  sightOffset.x = -0.0039
  sightOffset.z = 0.08
  sightScale = new THREE.Vector3(0.55, 0.55, 0.55)
  barrel.position.y = 0.8
  vrRoom.sounds.vintorez.forEach( sound => rifle.add(sound) )
  rifle.userData.sounds = vrRoom.sounds.vintorez
  return rifleModel
}

async function loadRifle() {
  rifle = new Object3D()
  const barrel = new Object3D()
  // const rifleModel = await loadSCAR(barrel)
  const rifleModel = await loadVintorez(rifle, barrel)
  rifleModel.add(barrel)
  barrel.rotation.copy(rifleModel.rotation)

  // console.log(rifle)
  rifle.add(rifleModel)
  scene.add(rifle)
  rifle.position.set(0, 2, 0)
  // rifle.scale.set(0.5, 0.5, 0.5)
  rifle.userData.barrel = barrel
}

function sq(a) {
  return Math.pow(a, 2)
}

const displacement = function (a, b) {
  return sq(a[0] - b[0]) + sq(a[1] - b[1]) + sq(a[2] - b[2])
}

function addSight() {
  sightRTT = new THREE.WebGLRenderTarget(512, 512)
  const sightMaterial = new THREE.MeshBasicMaterial({ map: sightRTT.texture })
  const sightGeometry = new THREE.CircleGeometry( 0.03, 8 )
  sight = new THREE.Mesh(sightGeometry, sightMaterial)
  // sight.position.z = -0.1
  // sight.position.y = 0.29
  sight.position.copy(sightOffset)
  sight.rotation.x = -Math.PI * 0.1
  sight.scale.copy(sightScale)
  rifle.add(sight)
  sightCamera = new THREE.PerspectiveCamera(2, 1, 1, 100)
  // sightCamera.position.y = 0.245
  sightCamera.rotation.x = -Math.PI * 0.1
  sightCamera.position.copy(sightOffset)
  rifle.add(sightCamera)
  // const helper = new THREE.CameraHelper(sightCamera)
  // scene.add(helper)
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
  // rifle.position.copy(controller.position)
  // rifle.rotation.copy(controller.rotation)
}

function makeBullet(controller) {
  const geometry = new THREE.BoxGeometry( 0.01, 0.01, 0.1 )
  var material = new THREE.MeshBasicMaterial( {color: 0x666600, emissive: 0.6 } )
  const bullet = new THREE.Mesh(geometry, material)
  const barrel = rifle.userData.barrel
  bullet.position.copy(barrel.localToWorld(new THREE.Vector3()))
  const direction = new THREE.Vector3()
  barrel.getWorldDirection(direction)
  // const velocity = direction.multiplyScalar(0.03)
  const velocity = direction.multiplyScalar(0.001)
  bullet.userData.velocity = velocity
  scene.add(bullet)
  const rotationMatrix = new THREE.Matrix4()
  const eye = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  rotationMatrix.lookAt(eye, direction, up)
  bullet.rotation.setFromRotationMatrix(rotationMatrix)
  const sound = rifle.userData.sounds.shift()
  vrRoom.playSound(sound)
  rifle.userData.sounds.push(sound)
  return bullet
}

function moveBullet(delta, bullet) {
  let bulletVelocity = bullet.userData.velocity
  // bulletVelocity.add(halfGravity)
  bulletVelocity = bulletVelocity.clone()
  bulletVelocity.multiplyScalar(delta * 4)
  const collisions = vrRoom.raycastIntersect(bullet, [...tiles])
  if (collisions.length > 0) {
    const collision = collisions[0]
    if (bulletVelocity.length() > collision.distance) {
      const impact = impacts.shift()
      impact.position.copy(collision.point)
      const objectName = collision.object.parent.name
      handleBulletCollision(collision)
      if ( objectName == "creature") {
        impact.material = redMaterial
        setTimeout( () => { impact.position.set(-1, -1, -1) }, 1000)
      } else {
        impact.material = blackMaterial
      }
      impacts.push(impact)
    }
  }
  bullet.position.add(bulletVelocity)
  const bulletWorld = bullet.localToWorld(new THREE.Vector3())
  if (bulletWorld.z < -20 ) {
    scene.remove(bullet)
  }
}

function fireRifle(time, controller) {
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
}

function handleBulletCollision(collision) {
  const objectName = collision.object.parent.name
  console.log("It's a COLLISION", objectName)
  collision.object.parent.visible = false
}

window.fireRifle = fireRifle
window.bullets = bullets

async function init() {
  await ensureHelvetiker()

  await loadFloor()
  await loadRifle()
  rifle.rotation.set(0.3, 0.1, 0)
  addImpacts()
  addSight()

  const atomicElements = Object.values(elements)
  const totalRows = table.length
  const tileOptions = { minHeight: 0.8, minWidth: 1.2, size: 0.2 }
  for (let y = 0; y < table.length; y++) {
    const row = table[y]
    for (let x = 0; x < row.length; x++) {
      const atomicNumber = row[x]
      if (atomicNumber == 0) {
        continue
      }
      const element = atomicElements[atomicNumber - 1]
      const text = element.symbol
      const tile = vrRoom.makeTextTile(text, tileOptions)
      tile.position.set(x - 9, totalRows - y, -16)
      scene.add(tile)
      tiles.push(tile)
      tileObjects[text] = tile
    }
  }
  console.log(elements)

  vrRoom.camera.position.set(0, 1.6, 5)
  vrRoom.controllerDecorator = controllerDecorator
  vrRoom.player.position.set(0, 0, 3)

  vrRoom.onSelect(fireRifle)

  vrRoom.onSqueeze((time, controller) => {
    vrRoom.controllerDecorator = null
    controller.add(rifle)
    rifle.position.set(0, 0, 0)
    rifle.rotation.y = - halfPi * 0.05
    rifle.rotation.x = - halfPi * 0.1
    if (controller.children.length > 0) {
      controller.children[0].visible = false
    }

  })

  // vrRoom.onSqueezeEnd((time, controller) => {
  // })

  vrRoom.onRender( (delta, frame, renderer) => {
    for (const bullet of bullets) {
      moveBullet(delta, bullet)
    }
    renderer.setRenderTarget(sightRTT)
    renderer.xr.enabled = false
    sight.visible = false
    rifle.visible = false
    renderer.render(scene, sightCamera)
    sight.visible = true
    rifle.visible = true
    renderer.setRenderTarget(null)
    renderer.xr.enabled = true
  })

  vrRoom.addMoveListener( ({ x, v }) => {
    const position = vrRoom.player.position.clone()
    position.add(x)
    for (const crate of crates) {
      const boundingBox = crate.userData.boundingBox
      if (boundingBox.containsPoint(position)) {
        x = new THREE.Vector3()
      }
    }
    if (position.y < 0) {
      x.y = 0
      v = new THREE.Vector3()
    }
    return ({ x, v })
  })

  // vrRoom.lookDown()
}

init().then()
