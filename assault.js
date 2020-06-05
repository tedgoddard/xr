import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import { Object3D } from "./js/three.module.js"
import { worm } from "./maze.js"
import { Creature } from "./creature.js"

const halfPi = Math.PI / 2
const vrRoom = new VRRoom()
window.vrRoom = vrRoom
const scene = vrRoom.scene
let rifle = null
let impacts = []
const rifleFire = { }
const bullets = []
const crates = []
let creature = null
let maze = null

const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
const redMaterial = new THREE.MeshBasicMaterial({ color: 0x660000 })

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

async function loadRifle() {
  rifle = new Object3D()
  const barrel = new Object3D()
  const rifleModel = await vrRoom.loadModel("models/scar.glb")
  rifle.add(rifleModel)
  rifleModel.add(barrel)
  vrRoom.sounds.ar15n.forEach( sound => rifle.add(sound) )
  rifleModel.rotation.y = halfPi
  rifleModel.rotation.x = - halfPi * 0.2
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

function addCrates() {
  maze = worm(10, 10, { steps: 8, style: "+" })
  for (let y = 0; y < maze.length; y++) {
    const row = maze[y]
    for (let x = 0; x < row.length; x++) {
      const cell = row[x]
      if (cell) {
        crates.push(makeCrate((x - 5) * 2, 1, y * -2))
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
  // const velocity = direction.multiplyScalar(0.03)
  const velocity = direction.multiplyScalar(0.005)
  bullet.userData.velocity = velocity
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

function mazeState(x, y, z) {
  x = Math.round(x / 2 + 5)
  z = Math.round(z / -2)
  return maze[z]?.[x] || 0
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

  const goal = creature.userData.goal
  const playerDistance = playerPosition.clone().sub(creature.position).length()
  const candidates = []
  for (const dz of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) {
      const testGoal = goal.clone()
      testGoal.x += dx
      testGoal.z += dz
      const crate = mazeState(...testGoal.toArray())
      if (crate == 0) {
        const d = playerPosition.clone().sub(testGoal).length()
        const v =  testGoal
        candidates.push({ d, v })
      }
    }
  }
  candidates.sort( (a,b) => a.d - b.d )
  const best = randomHead(candidates)
  if (!best) {
    return
  }
  creature.userData.goal.copy(best.v)
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
  bulletVelocity.add(vrRoom.gravity)
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
        setTimeout( () => { impact.position.set(-1, -1, -1) }, 500)
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
  creature = new Creature()
  scene.add(creature)
  creature.position.copy(new THREE.Vector3(-8, 0, -22))
  creature.userData.goal.copy(new THREE.Vector3(-8, 0, -22))

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
    rifle.rotation.y = - halfPi * 0.05
    rifle.rotation.x = - halfPi * 0.1
    if (controller.children.length > 0) {
      controller.children[0].visible = false
    }
  })
  vrRoom.onRender( (delta, frame) => {
    creature.update(delta, frame)
    moveCreature(delta, frame)
    for (const bullet of bullets) {
      moveBullet(delta, bullet)
    }
  })
  vrRoom.addMoveListener( delta => {
    const position = vrRoom.player.position.clone()
    creature.userData.goal.copy(position)
    position.add(delta)
    for (const crate of crates) {
      const boundingBox = crate.userData.boundingBox
      if (boundingBox.containsPoint(position)) {
        return new THREE.Vector3()
      }
    }
    return delta
  })
  // vrRoom.lookDown()
}

init().then()
