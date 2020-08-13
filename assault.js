import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { Object3D } from "./js/three.module.js"
import { worm, path, dump } from "./maze.js"
import { Creature } from "./creature.js"
import { TypedArrayUtils } from './jsm/utils/TypedArrayUtils.js'

const halfPi = Math.PI / 2
const vrRoom = new VRRoom()
window.vrRoom = vrRoom
const scene = vrRoom.scene
let rifle = null
let impacts = []
const rifleFire = { }
const bullets = []
const crates = []
let crateTree = null
let creature = null
let maze = null
let sight = null
let sightOffset = new THREE.Vector3()
let sightScale = 1
let sightRTT = null
let sightCamera = null
let gripper = null

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

function makeCrate(x, y, z) {
  const height = Math.floor(Math.random() * 3.5)
  y = height / 2
  const geometry = new THREE.BoxGeometry(2, height, 2)
  const material = new THREE.MeshLambertMaterial({ color: 0x666666 })
  material.transparent = true
  material.opacity = 0.5
  var cube = new THREE.Mesh(geometry, material)
  cube.position.set(x, y, z)
  scene.add(cube)
  const box = new THREE.Box3()
  box.setFromObject(cube)
  box.expandByScalar(0.09)
  cube.userData.boundingBox = box
  return cube
}

function sq(a) {
  return Math.pow(a, 2)
}

function hasPosition(object, coords) {
  const position = object.position
  return position.x == coords[0] && position.y == coords[1] && position.z == coords[2]
}

const displacement = function (a, b) {
  return sq(a[0] - b[0]) + sq(a[1] - b[1]) + sq(a[2] - b[2])
}

function addCrates() {
  const width = 10
  const height = 10
  maze = worm(width, height, { steps: 8, style: "+" })
  maze.unshift([0,0,0,0,0,0,0,0,0,0,])
  maze.push([0,0,0,0,0,0,0,0,0,0,])
  console.log("lentght", maze.length)
  const crateCoords = []
  const unsortedCrates = []
  for (let j = 0; j < maze.length; j++) {
    const row = maze[j]
    for (let i = 0; i < row.length; i++) {
      const cell = row[i]
      if (cell) {
        const crate = makeCrate((i - 5) * 2, 1, j * -2)
        unsortedCrates.push(crate)
        crateCoords.push(...crate.position.toArray())
      }
    }
  }
  const crateCoordsFloat32 = Float32Array.from(crateCoords)
  crateTree = new TypedArrayUtils.Kdtree(crateCoordsFloat32, displacement, 3)
  for (let i = 0; i < crateCoordsFloat32.length; i += 3) {
    const crateCoord = crateCoordsFloat32.slice(i, i + 3)
    const crate = unsortedCrates.find(crate => hasPosition(crate, crateCoord))
    crates.push(crate)
  }

  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  gripper = new THREE.Mesh(geometry, material)
  scene.add(gripper)
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

function mazeState(maze, x, y, z) {
  const [i, j] = mazeIndex(maze, x, y, z)
  return maze[j]?.[i] || 0
}

function mazeIndex(maze, x, y, z) {
  let i = Math.round(x / 2 + 5)
  let j = Math.round(z / -2)
  i = Math.min(i, maze[0].length)
  j = Math.min(j, maze.length)
  i = Math.max(i, 0)
  j = Math.max(j, 0)
  return [i, j]
}

function mazeVector(maze, a) {
  const [i, j] = a
  return new THREE.Vector3((i - 5) * 2, 1, j * -2)
}

function randomHead(items) {
  const r = Math.exp(items.length)
  const dr = r * Math.random()
  const i = Math.floor(items.length - Math.log(dr))
  return items[i]
}

function updateGoal() {
  const playerPosition = vrRoom.player.position.clone()
  const creaturePosition = creature.position.clone()

  const playerIndex = mazeIndex(maze, ...playerPosition.toArray())
  const creatureIndex = mazeIndex(maze, ...creaturePosition.toArray())
  const p = path(maze, playerIndex, creatureIndex)
  if (!p) {
    console.log("no path")
    return
  }

  const [goal, end] = p.slice(-2)
  creature.userData.goal.copy(mazeVector(maze, goal))
  window.creature = creature
}

function moveCreature(delta, frame) {
  let { goal, speed } = creature.userData
  goal = goal.clone()
  const velocity = goal.clone()
  velocity.sub(creature.position)
  velocity.normalize()
  velocity.multiplyScalar(speed)
  creature.position.add(velocity)
  const goalDistance = goal.sub(creature.position).length()
  if (goalDistance < 0.01) {
    updateGoal()
  }
}

function moveBullet(delta, bullet) {
  let bulletVelocity = bullet.userData.velocity
  // bulletVelocity.add(halfGravity)
  bulletVelocity = bulletVelocity.clone()
  bulletVelocity.multiplyScalar(delta * 4)
  const collisions = vrRoom.raycastIntersect(bullet, [...crates, creature])
  if (collisions.length > 0) {
    const collision = collisions[0]
    if (bulletVelocity.length() > collision.distance) {
      const impact = impacts.shift()
      impact.position.copy(collision.point)
      if (collision.object.parent.name == "creature") {
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
  if (bulletWorld.z < -10 ) {
    scene.remove(bullet)
  }
}

async function init() {
  await loadFloor()
  await loadRifle()
  addCrates()
  addImpacts()
  addSight()
  creature = new Creature()
  scene.add(creature)
  creature.position.copy(new THREE.Vector3(-8, 0, -22))

  vrRoom.camera.position.set(0, 1.6, 5)
  vrRoom.controllerDecorator = controllerDecorator
  vrRoom.player.position.set(0, 0, 3)
  updateGoal()

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
    rifle.rotation.y = - halfPi * 0.05
    rifle.rotation.x = - halfPi * 0.1
    if (controller.children.length > 0) {
      controller.children[0].visible = false
    }

    gripper.userData.gripStart = gripper.userData.gripStart || {
      gripperStart: gripper.position.clone(),
      controllerStart: controller.position.clone(),
      playerStart: vrRoom.player.position.clone(),
      controller
    }
    gripper.material = greenMaterial
  })

  vrRoom.onSqueezeEnd((time, controller) => {
    gripper.material = blueMaterial
    gripper.userData.gripStart = null
  })

  vrRoom.onRender( (delta, frame, renderer) => {
    creature.update(delta, frame)
    moveCreature(delta, frame)
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

    const playerPosition = vrRoom.player.position.toArray()
    const maxDistance = 10
    const count = 10
    const nearCrates = crateTree.nearest(playerPosition, count, maxDistance)
    for (const hit of nearCrates) {
      const pos = hit[0].pos
      const crate = crates[pos]
      if (!crate) {
        continue
      }
      const collisions = vrRoom.raycastIntersect(vrRoom.controller1, [crate])
      if (collisions.length > 0) {
        const collision = collisions[0]
        gripper.position.copy(collision.point)
      }
    }

    const gripStart = gripper.userData.gripStart
    if (gripStart) {
      const { playerStart, controllerStart, controller } = gripStart
      const controllerNow = controller.position.clone()
      const playerMoved = playerStart.clone()
      playerMoved.sub(controllerNow.sub(controllerStart))
      vrRoom.player.position.copy(playerMoved)
      gripper.material = yellowMaterial
    }
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
