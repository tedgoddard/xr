import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js'
import { AmmoPhysics } from './js/AmmoPhysics.js'
import { HAND } from './hand.js'

// hand tracking inspired by https://webxr-handtracking.vercel.app/basic.html

const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true })
const scene = vrRoom.scene
const player = vrRoom.player
const physics = await AmmoPhysics();

let balloon
let boxes
const balloonStart = [0, 1, -2]
let balloonBox

let xrRefSpace = null
let boxes_left = []
let boxes_right = []
const fingerTips = {
  left: [],
  right: []
}
let hands = { left: boxes_left, right: boxes_right }
const handColor = 0x550505
const handMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 70, flatShading: true, specular: handColor })
const tipMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 70, flatShading: true, specular: handColor })

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)
  mesh.receiveShadow = true

  const solidFloor = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.1, 10),
    new THREE.MeshBasicMaterial({ color: 0xAAAAAA })
  );
  scene.add(solidFloor)
  solidFloor.receiveShadow = true
  solidFloor.position.y = - 0.1
  physics.addMesh(solidFloor)
}

function createBalloon() {
  const geometry = new THREE.SphereGeometry(0.2, 32, 32)
  const material = new THREE.MeshStandardMaterial({ color:  0xff4466, roughness: 0.8, metalness: 0.2 })
  balloon = new THREE.Mesh(geometry, material)
  balloon.position.set(...balloonStart)
  scene.add(balloon)
}

function addBox(x, y, z, box_list, offset, options = { }) {
  const material = options.material  ?? handMaterial
  const target = options.target  ?? scene
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1)
  const cube = new THREE.Mesh(geometry, material)
  cube.castShadow = true
  box_list.push({
    mesh: cube,
    position: [x, y, z],
    offset: offset
  })
  target.add(cube)
}

function addBoxes() {
  const material = new THREE.MeshPhongMaterial({ color: handColor, shininess: 70, flatShading: true, specular: 0x111188 })
  
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()

  const geometryBox = new THREE.BoxGeometry(0.1, 0.1, 0.1)
  boxes = new THREE.InstancedMesh(geometryBox, material, 10)
  boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  boxes.castShadow = true
  boxes.receiveShadow = true
  scene.add(boxes)

  for ( let i = 0; i < boxes.count; i ++ ) {

    matrix.setPosition( Math.random() - 0.5, Math.random() * 2, Math.random() - 0.5 );
    boxes.setMatrixAt( i, matrix );
    boxes.setColorAt( i, color.setHex( 0xffffff * Math.random() ) );

  }

  physics.addMesh( boxes, 1 );

}

function initHands() {
  for (const box of [...boxes_left, ...boxes_right]) {
    scene.remove(box.mesh)
  }
  boxes_left = []
  boxes_right = []
  hands = { left: boxes_left, right: boxes_right }
  if (XRHand) {
    for (let i = 0; i <= HAND.LITTLE_PHALANX_TIP; i++) {
      addBox(0, 0, 0, boxes_left, i, { target: player })
      addBox(0, 0, 0,  boxes_right, i, { target: player })
    }
  }
  addBox(0, 0, 0, fingerTips.left, 0, { material: tipMaterial, target: player })
  addBox(0, 0, 0, fingerTips.right, 0, { material: tipMaterial, target: player })
}

vrRoom.onSessionStarted((session) => {
  initHands()
  session.requestReferenceSpace('local').then((refSpace) => {
    xrRefSpace = refSpace.getOffsetReferenceSpace(new XRRigidTransform({x: 0, y: 0, z: 0}))
  })
})

async function init() {
  await loadFloor()
  createBalloon()
  addBoxes()
}

const jointRadii = new Float32Array(25)
const jointPositions = new Float32Array(16 * 25)
const jointMatrix = new THREE.Matrix4()

function updateHandPose(inputSource, frame, refSpace) {
  if (!frame.fillJointRadii(inputSource.hand.values(), jointRadii)) {
    return
  }
  if (!frame.fillPoses(inputSource.hand.values(), refSpace, jointPositions)) {
    return
  }
}

function updateHandBoxes(hand) {
  for (const offset in hand) {
    const box = hand[offset]
    const sliceOffset = offset * 16
    const jointSlice = jointPositions.slice(sliceOffset, sliceOffset + 16)
    jointMatrix.set(...jointSlice)
    jointMatrix.transpose()
    const jointRadius = jointRadii[offset]
    box.mesh.position.setFromMatrixPosition(jointMatrix)
    box.mesh.position.y += 0.95 // correct for vrRoom camera position
    box.mesh.quaternion.setFromRotationMatrix(jointMatrix)
    box.mesh.scale.set(20 * jointRadius, 10 * jointRadius, 40 * jointRadius);
  }
}

function applyJointPose(pose, mesh) {
  const position = pose.transform.position
  const orientation = pose.transform.orientation
  // const radius = pose.radius * 40
  const radius = 0.1
  mesh.position.set(position.x, position.y, position.z)
  mesh.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w)
  mesh.scale.set(radius, radius, radius)
}

function updateFingerTip(box, renderer, inputSource, frame, refSpace) {
  const fingerTip = inputSource.hand.get('index-finger-tip')
  const pose = frame.getJointPose(fingerTip, refSpace)
  applyJointPose(pose, box.mesh)
  box.mesh.position.y += 0.95 // correct for vrRoom camera position
  const radius = 0.08
  box.mesh.scale.set(radius, radius, radius)
}

function updateInputSources(session, renderer, frame, refSpace) {
  session.inputSources.forEach( inputSource => {
    if (!inputSource.hand) {
      return  
    }
    const handedness = inputSource.handedness
    updateHandPose(inputSource, frame, refSpace)
    const hand = hands[handedness]
    updateHandBoxes(hand)
    updateFingerTip(fingerTips[handedness][0], renderer, inputSource, frame, refSpace)
  })
}

function grabCheck(hand) {
  const indexTip = hand[HAND.INDEX_PHALANX_TIP].mesh
  const thumbTip = hand[HAND.THUMB_PHALANX_TIP].mesh
  const distance = indexTip.position.distanceTo(thumbTip.position)
  return distance < 0.01
}

const offsets = { left: null, right: null }

function applyGrab(hand) {
  const theHand = hands[hand]
  let theOffset = offsets[hand]
  if (grabCheck(theHand)) {
    const handPosition = theHand[HAND.INDEX_PHALANX_TIP].mesh.position
    if (balloonBox.containsPoint(handPosition)) {
      if (!theOffset) {
        theOffset = new THREE.Vector3().subVectors(handPosition, balloon.position)
      }
      balloon.position.set(handPosition.x - theOffset.x, handPosition.y - theOffset.y, handPosition.z - theOffset.z)
    }
  } 
  offsets[hand] = theOffset
}

vrRoom.onRender( (time, frame, renderer) => {
  if (!frame) { return }
  if (!xrRefSpace) { return }

  const session = renderer.xr.getSession()
  updateInputSources(session, renderer, frame, xrRefSpace)

  balloon.geometry.computeBoundingBox()
  balloonBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3())
  balloonBox.setFromObject(balloon)

  applyGrab("left")
  applyGrab("right")
})

init().then()