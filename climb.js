import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js'
import { TypedArrayUtils } from './jsm/utils/TypedArrayUtils.js'
import { worm, path, dump } from "./maze.js"
import { HAND } from "./hand.js"

const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, gravity: true })
const scene = vrRoom.scene

scene.background = new THREE.CubeTextureLoader()
  .setPath( 'images/skyboxsun25deg/' )
  .load( [ 'px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg' ] );

let maze = null
const crates = []
let crateTree = null
let gripper = null
let grippers = { }
let marker = null
let bulbLight = null
let xrRefSpace = null
const hands = { left: [], right: [] }
const redHand = new THREE.Color(0x550505)
const greenHand = new THREE.Color(0x055505)
const brightGreenHand = new THREE.Color(0x058805)
const brightRedHand = new THREE.Color(0x880505)
const handMaterials = {
  left: new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 70, flatShading: true, specular: redHand }),
  right:new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 70, flatShading: true, specular: redHand })
}
const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
const redMaterial = new THREE.MeshBasicMaterial({ color: 0x660000 })
const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x006600 })
const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x000066 })
const yellowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 })
const tanMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, side: THREE.DoubleSide })
const shinyWhiteMaterial = new THREE.MeshPhongMaterial({ color: 0xEEEEEE, shininess: 70, flatShading: true, specular: 0xEEDDDD, side: THREE.DoubleSide })
const greyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 })

const radii = new Float32Array(25)
const positions = new Float32Array(16*25)
const theMatrix = new THREE.Matrix4()

async function loadTextures() {
  const concrete = await vrRoom.loadTexture("images/smooth.png")
  concrete.wrapS = THREE.RepeatWrapping
  concrete.wrapT = THREE.RepeatWrapping
  concrete.repeat.set(2, 2)
  tanMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, side: THREE.DoubleSide, bumpMap: concrete, bumpScale: 0.02 })
}

async function loadFloor() {
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(25, 0.1, 20), greyMaterial))
}

function sq(a) {
  return a * a
}

const displacement = function (a, b) {
  return sq(a[0] - b[0]) + sq(a[1] - b[1]) + sq(a[2] - b[2])
}

function hasPosition(object, coords) {
  const position = object.position
  return position.x == coords[0] && position.y == coords[1] && position.z == coords[2]
}

function makeCrate(x, y, z, options = { }) {
  const height = 2 + Math.floor(Math.random() * 1.5)
  z = height / 2
  const geometry = new THREE.BoxGeometry(2, 2, height)
  geometry.computeBoundingBox()
  const material = options.material || tanMaterial
  var cube = new THREE.Mesh(geometry, material)
  cube.position.set(x, y, z)
  const boundingBox = new THREE.Box3()
  boundingBox.setFromObject(cube)
  cube.userData = {...options.userData, boundingBox}
  scene.add(cube)
  return cube
}

function addWall() {
  const width = 10
  const height = 10
  maze = worm(width, height, { steps: 8, style: "+" })
  maze.unshift([0,0,0,0,0,0,0,0,0,0,])
  maze.push([0,0,0,0,0,0,0,0,0,0,])
  const crateCoords = []
  const unsortedCrates = []
  for (let j = 0; j < maze.length; j++) {
    const row = maze[j]
    for (let i = 0; i < row.length; i++) {
      const cell = row[i]
      const userData = { }
      if (cell) {
        userData.friction = 0
        const material = shinyWhiteMaterial
        const crate = makeCrate((i - 5) * 2, j * 2, 1, { material, userData })
        unsortedCrates.push(crate)
        crateCoords.push(...crate.position.toArray())
      } else {
        userData.friction = 1
        const material = tanMaterial
        const crate = makeCrate((i - 5) * 2, j * 2, 1, { material, userData })
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

  const gripperGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
  grippers.left = new THREE.Mesh(gripperGeometry, redMaterial)
  grippers.right = new THREE.Mesh(gripperGeometry, blueMaterial)
  grippers.left.position.z = 0.3
  grippers.right.position.z = 0.5
  grippers.left.visible = false
  grippers.right.visible = false
  scene.add(grippers.left)
  scene.add(grippers.right)

  marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 0.1, 0.1), blackMaterial)
  vrRoom.player.add(marker)
}

function addLights() {
  bulbLight = new THREE.SpotLight(0xffee88)
  bulbLight.position.set(0, 30, 7)
  bulbLight.angle = Math.PI / 6
  const target = new THREE.Object3D()
  target.position.set(0, 0, 5)
  scene.add(bulbLight)
  scene.add(target)
}

vrRoom.onSqueeze((time, controller) => {
  vrRoom.controllerDecorator = null
  const gripper = grippers[controller.userData.hand]
  gripper.userData.gripStart = gripper.userData.gripStart || {
    gripperStart: gripper.position.clone(),
    controllerStart: controller.position.clone(),
    playerStart: vrRoom.player.position.clone(),
    controller
  }
  gripper.material = greenMaterial
})

vrRoom.onSqueezeEnd((time, controller) => {
  const gripper = grippers[controller.userData.hand]
  gripper.material = blueMaterial
  gripper.userData.gripStart = null
})

vrRoom.onRender( (time, frame, renderer) => {
  const session = renderer.xr.getSession()
  if (!session) {
    return
  }
  if (session.visibilityState === 'visible-blurred') {
    return
  }
  renderHands(session, time, frame)
  climbWithGripper(time, frame, renderer)
})

vrRoom.addMoveListener( ({ x, v })=> {
  const position = vrRoom.player.position.clone()
  position.add(x)
  for (const crate of crates) {
    const boundingBox = crate.userData.boundingBox.clone().expandByScalar(0.09)
    if (boundingBox.containsPoint(position)) {
      x = new THREE.Vector3()
    }
  }
  if (position.y < 0) {
    x.y = 0
    v = new THREE.Vector3()
  }
  return { x, v }
})

function addBox(x, y, z, box_list, offset, options) {
  const { material = blackMaterial } = options
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const cube = new THREE.Mesh(geometry, material)
  cube.scale.set(0.01, 0.01, 0.01)

  cube.castShadow = true;
  box_list.push({
    mesh: cube,
    position: [x, y, z],
    offset: offset
  })
  return cube
}

function initHands() {
  for (const box of [...hands.left, ...hands.right]) {
    scene.remove(box.mesh)
  }
  hands.left = []
  hands.right = []
  if (XRHand) {
    for (let i = 0; i <= HAND.LITTLE_PHALANX_TIP; i++) {
      vrRoom.player.add(addBox(0, 0, 0, hands.left, i, { material: handMaterials.left }))
      vrRoom.player.add(addBox(0, 0, 0,  hands.right, i, { material: handMaterials.right }))
    }
  }
}

function updateHand(inputSource, frame) {
  const hand = inputSource.hand
  if (!hand) {
    return
  }
  // const pose = frame.getPose(inputSource.targetRaySpace, refSpace)
  if (!frame.fillJointRadii(hand.values(), radii)) {
    return
  }
  if (!frame.fillPoses(hand.values(), xrRefSpace, positions)) {
    return
  }

  for (const box of hands[inputSource.handedness]) {
    const positionsOffset = box.offset * 16
    const entries = positions.slice(positionsOffset, positionsOffset + 16);
    theMatrix.set(...Object.values(entries))
    theMatrix.transpose()
    box.mesh.position.setFromMatrixPosition(theMatrix)
    box.mesh.position.y += 1.5
    box.mesh.setRotationFromMatrix(theMatrix)
    const jointRadius = radii[box.offset] ?? 1
    box.mesh.scale.set(2 * jointRadius, jointRadius, 4 * jointRadius)
  }
}

function updateInputSources(session, frame) {
  for (const inputSource of session.inputSources) {
    updateHand(inputSource, frame)
  }
}

function pinchCheck(hand) {
  const indexTip = hand[HAND.INDEX_PHALANX_TIP].mesh
  const thumbTip = hand[HAND.THUMB_PHALANX_TIP].mesh
  const distance = indexTip.position.distanceTo(thumbTip.position)
  return distance < 0.01
}

function fingerCurl(hand, finger) {
  const wrist = hand[HAND.WRIST].mesh
  const fingerMesh = hand[finger].mesh
  return wrist.quaternion.dot(fingerMesh.quaternion)
}

function handFlatness(hand) {
  const fingerCurls = vrRoom.fingers.map( finger => fingerCurl(hand, finger) )
  const totalCurl = fingerCurls.reduce( (total, next) => total + next )
  const scaledCurl = Math.min(totalCurl / 4, 1.0)
  return scaledCurl
}

const offsets = { left: null, right: null }

function applyGrab(time, hand) {
  const theHand = hands[hand]
  const wristMesh = theHand[HAND.WRIST].mesh
  const controller = wristMesh
  const gripper = grippers[hand]
  gripper.position.copy(wristMesh.localToWorld(new THREE.Vector3()))
  let theOffset = offsets[hand]
  const flatness = handFlatness(theHand)
  handMaterials[hand].specular = brightRedHand.clone().lerp(brightRedHand, flatness)

  if (flatness < 0.8) {
    gripper.material = tanMaterial
    if (!gripperSticks(controller)) {
      return
    }  
    theHand.isGrabbing = true
    const handPosition = wristMesh.position.clone()
    gripper.material = blackMaterial
    handMaterials[hand].specular = brightGreenHand
    gripper.userData.gripStart = gripper.userData.gripStart || {
      gripperStart: handPosition,
      playerStart: vrRoom.player.position.clone(),
      controller,
      time
    }  
  } else {
    handMaterials[hand].specular = redHand
    gripper.material = redMaterial
    if (theHand.isGrabbing) {
      //pinch ended
      gripper.userData.gripStart = null
      theHand.isGrabbing = false
      gripper.material = greenMaterial
    }
  }
  offsets[hand] = theOffset
}

function renderHands(session, time, frame) {
  if (!frame) { return }
  if (!xrRefSpace) { return }
  updateInputSources(session, frame)

  applyGrab(time, "left")
  applyGrab(time, "right")
}

function gripperSticks(controller) {
  if (!crateTree) {
    return
  }

  const position = controller.localToWorld(new THREE.Vector3()).toArray()
  const gripBox = new THREE.Box3()
  gripBox.setFromObject(controller)
  gripBox.expandByScalar(0.08)

  const maxDistance = 5
  const count = 4
  const nearCrates = crateTree.nearest(position, count, maxDistance)
  for (const hit of nearCrates) {
    const pos = hit[0].pos
    const crate = crates[pos]
    if (!crate) {
      continue
    }
    const crateBox = crate.userData.boundingBox
    const intersects = gripBox.intersectsBox(crateBox)
    if (intersects) {
      return true
    }
  }
  return false
}

function updateGripper(delta, frame, renderer) {
  if (!crateTree) {
    return
  }
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
}

function gripperMoved(gripper) {
  const gripStart = gripper.userData?.gripStart
  if (!gripStart) {
    return null
  }
  const { playerStart, gripperStart, controller } = gripStart
  const gripperNow = controller.position.clone()
  return gripperNow.sub(gripperStart)
}

function playerGripStart() {
  const gripperList = [grippers.left, grippers.right]
  const gripStarts = gripperList.map( gripper => gripper.userData?.gripStart )
  const active = gripStarts.filter( item => item )
  if (active.length == 0) {
    return null
  }
  const [newest] = active.sort( (a, b) => b.time - a.time )
  return newest.playerStart.clone()
}

function climbWithGripper(time, frame, renderer) {
  const playerMoved = playerGripStart()
  if (!playerMoved) {
    return
  }

  //TODO: simplify detecting one or two active grippers
  let leftMoved = gripperMoved(grippers.left)
  let rightMoved = gripperMoved(grippers.right)
  let count = 2
  if (leftMoved == null || rightMoved == null) {
    count = 1
  }
  leftMoved = leftMoved || new THREE.Vector3()
  rightMoved = rightMoved || new THREE.Vector3()

  const netMovement = leftMoved.add(rightMoved).divideScalar(count)
  playerMoved.sub(netMovement)
  vrRoom.player.position.copy(playerMoved)
  vrRoom.player.userData.velocity = new THREE.Vector3()
}

vrRoom.onSessionStarted((event) => {
  const session = event.target.getSession()
  initHands()
  session.requestReferenceSpace('local').then((refSpace) => {
    xrRefSpace = refSpace.getOffsetReferenceSpace(new XRRigidTransform({x: 0, y: 1.5, z: 0}))
  })
})

async function init() {
  await loadFloor()
  addWall()
  addLights()
  vrRoom.player.position.set(0, 4, 4)
}

init().then()
