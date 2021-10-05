import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js'
import { AmmoPhysics } from './js/AmmoPhysics.js'

// hand tracking inspired by https://webxr-handtracking.vercel.app/basic.html

const vrRoom = new VRRoom()
const scene = vrRoom.scene
const physics = await AmmoPhysics();

let balloon
let boxes
const balloonStart = [0, 1, -0.5]
let balloonBox

let xrRefSpace
let boxes_left = []
let boxes_right = []
let hands = { left: boxes_left, right: boxes_right }
const handColor = 0x550505
const handMaterial = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 70, flatShading: true, specular: handColor })

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
    new THREE.ShadowMaterial({ color: 0x111111 })
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

function addBox(x, y, z, box_list, offset) {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const cube = new THREE.Mesh(geometry, handMaterial)
  cube.castShadow = true
  box_list.push({
    mesh: cube,
    position: [x, y, z],
    offset: offset
  })
}

function addBoxes() {
  // const material = new THREE.MeshLambertMaterial()
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
    for (let i = 0; i <= XRHand.LITTLE_PHALANX_TIP; i++) {
      addBox(0, 0, 0, boxes_left, i)
      addBox(0, 0, 0,  boxes_right, i)
    }
  }
}

vrRoom.onSessionStarted((session) => {
  initHands()
  session.requestReferenceSpace('local').then((refSpace) => {
    xrRefSpace = refSpace.getOffsetReferenceSpace(new XRRigidTransform({x: 0, y: 1.5, z: 0}))
  })
})

async function init() {
  await loadFloor()
  createBalloon()
  addBoxes()
}

init().then()

function updateHandBox(box, inputSource, frame, refSpace) {
  const boxOffset = inputSource.hand[box.offset]
  if (boxOffset == null) {
    return
  }
  const jointPose = frame.getJointPose(boxOffset, refSpace)
  if (jointPose) {
    const jointPosition = jointPose.transform.position
    const jointOrientation = jointPose.transform.orientation
    scene.add(box.mesh)
    box.mesh.position.set(jointPosition.x, jointPosition.y + 1.5, jointPosition.z)
    const q = new THREE.Quaternion(jointOrientation.x, jointOrientation.y, jointOrientation.z, jointOrientation.w)
    box.mesh.quaternion.copy(q)
    box.mesh.scale.set(4 * jointPose.radius, jointPose.radius, 2 * jointPose.radius);
  } else {
    scene.remove(box.mesh)
  }

}

function updateInputSources(session, frame, refSpace) {
  session.inputSources.forEach( inputSource => {
    if (!inputSource.hand) {
      return  
    }
    for (const box of hands[inputSource.handedness]) {
      updateHandBox(box, inputSource, frame, refSpace)
    }
  })
}

function grabCheck(hand) {
  const indexTip = hand[XRHand.INDEX_PHALANX_TIP].mesh
  const thumbTip = hand[XRHand.THUMB_PHALANX_TIP].mesh
  const distance = indexTip.position.distanceTo(thumbTip.position)
  return distance < 0.01
}

const offsets = { left: null, right: null }

function applyGrab(hand) {
  const theHand = hands[hand]
  let theOffset = offsets[hand]
  if (grabCheck(theHand)) {
    const handPosition = theHand[XRHand.INDEX_PHALANX_TIP].mesh.position
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

  updateInputSources(renderer.xr.getSession(), frame, xrRefSpace)

  balloon.geometry.computeBoundingBox()
  balloonBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3())
  balloonBox.setFromObject(balloon)

  applyGrab("left")
  applyGrab("right")
})
