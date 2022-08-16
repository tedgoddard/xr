import { VRRoom, ivory, ebony } from "./vrroom.js"
import {
  Euler, Quaternion, Vector3, Box3, Matrix4,
  BoxGeometry, SphereGeometry, Mesh, MeshStandardMaterial,
  MeshBasicMaterial, MeshPhongMaterial, Clock
} from './js/three.module.js'
import { TransformControls } from './jsm/controls/TransformControls.js'

import "./js/jscad-modeling.min.js"
import { csg2geom } from "./csg2geom.js"

const Modeling = jscadModeling
const {
  cube,
  cuboid,
  cylinder,
  cylinderElliptic,
  geodesicSphere,
  roundedCuboid,
  roundedCylinder,
  sphere,
  torus,
  polyhedron
} = Modeling.primitives
const { translate, rotate, scale, transform } = Modeling.transforms
const { intersect, subtract, union } = Modeling.booleans

const greyMaterial = new MeshPhongMaterial( { color: 0x888888, flatShading: true } )
const theQuaternion = new Quaternion()
const theEuler = new Euler()
const thePosition = new Vector3()
const theMatrix = new Matrix4()
const theBox = new Box3()

const csgWorker = new Worker("./csgworker.js", { type: "module" })
csgWorker.onmessage = handleWorkerOutput
csgWorker.onerror = error => {
  csgWorker.busy = false
  console.log(error.message, error)
}

const vrRoom = new VRRoom({ disableGrid: true })
const scene = vrRoom.scene
const clock = new Clock()
clock.start()

const baseCube = cube({ size: 1 })
const baseBall = sphere({ size: 1 })
const floorCube = cuboid({ size: [10, 2, 10] })
let totalCSG = translate([0, -1, 0], floorCube)
let boolOp = subtract
let boolOpName = "subtract"

const boxGeometry = new BoxGeometry(1, 1, 1)
const ballGeometry = new SphereGeometry(1, 8, 8)
const greenFrame = new MeshStandardMaterial({ color: 0x00ff00, wireframe: true })
const redFrame = new MeshStandardMaterial({ color: 0xff0000, wireframe: true })
const greenBall= new Mesh( ballGeometry, greenFrame )
const redCube = new Mesh( boxGeometry, redFrame )
scene.add(greenBall)
scene.add(redCube)

const markerGeometry = new BoxGeometry(.1, .1, .1)
const markerBox = new Mesh( markerGeometry, redFrame )
scene.add(markerBox)

let objectHeld = redCube
let refreshCSG = true

const blackBox = new Mesh( markerGeometry, ebony )
blackBox.position.set(2, 1, 2)
scene.add(blackBox)

const whiteBox = new Mesh( markerGeometry, ivory )
whiteBox.position.set(2.3, 1, 2)
scene.add(whiteBox)

const squeezables = [greenBall, redCube, blackBox, whiteBox]

greenBall.position.x = 2
greenBall.position.z = 2
greenBall.userData.baseObject = baseBall
redCube.userData.baseObject = baseCube
greenBall.userData.csg = baseBall
redCube.userData.csg = baseCube

function doBool(message) {
  if (csgWorker.busy) {
    return
  }
  csgWorker.busy = true
  csgWorker.postMessage(message)
}

const transformControl = new TransformControls(vrRoom.camera, vrRoom.renderer.domElement)
transformControl.addEventListener('dragging-changed', event => {
  vrRoom.controls.enabled = !event.value
  const retain = false
  doBool({ op: boolOpName, arg: objectHeld.userData.csg, retain })
})
transformControl.addEventListener('change', event => {
  const retain = false
  doBool({ op: boolOpName, arg: objectHeld?.userData?.csg, retain })
})

scene.add(transformControl)
transformControl.attach(redCube)

document.addEventListener('keyup', event => {
  if (event.code?.toLowerCase() == 'space') {
    csgWorker.busy = false
    const retain = true
    doBool({ op: boolOpName, arg: objectHeld?.userData?.csg, retain })
  }
  if (event.code?.toLowerCase() == 'keyr') {
    transformControl.setMode('rotate')
  }
  if (event.code?.toLowerCase() == 'keyt') {
    transformControl.setMode('translate')
  }
})

let geomMesh = null

function handleWorkerOutput(event) {
  csgWorker.busy = false
  const { geometry } = event.data
  if (!geometry) {
    return
  }

  const threeGeometry = csg2geom(geometry)
  if (!geomMesh) {
    geomMesh = new Mesh(threeGeometry, greyMaterial)
    geomMesh.castShadow = true
    scene.add(geomMesh)
  } else {
    geomMesh.geometry.dispose()
    geomMesh.geometry = threeGeometry
  }
}

function initSqueezableBounds() {
  for (const squeezable of squeezables) {
    squeezable.geometry.computeBoundingBox()
  }
}

function matchSqueezable(controller) {
  const controllerWorld = controller.localToWorld(new Vector3())
  for (const squeezable of squeezables) {
    console.log({squeezable})
    const boundingBox = squeezable.geometry.boundingBox
    console.log({controllerWorld, boundingBox})
    theBox.copy(boundingBox).applyMatrix4(squeezable.matrixWorld)
    if (theBox.containsPoint(controllerWorld)) {
      return squeezable
    }
  }
  return null
}


vrRoom.onSelectEnd((time, controller) => {
  const retain = true
  csgWorker.busy = false
  doBool({ op: boolOpName, arg: objectHeld.userData.csg, retain })
})

vrRoom.onSqueeze((time, controller) => {
  refreshCSG = true
  if (objectHeld) {
    return
  }
  const squeezable = matchSqueezable(controller)
  if (!squeezable) {
    return
  }
  if (squeezable == blackBox) {
    boolOp = subtract
    boolOpName = "subtract"
    return
  }
  if (squeezable == whiteBox) {
    boolOp = union
    boolOpName = "union"
    return
  }
  objectHeld = squeezable
  controller.attach(objectHeld)
})

vrRoom.onSqueezeEnd((time, controller) => {
  const controllerWorld = controller.localToWorld(new Vector3())
  markerBox.position.copy(controllerWorld)
  const squeezable = matchSqueezable(controller)
  if (!objectHeld) {
    return
  }
  scene.attach(objectHeld)
  objectHeld = null
})

function updateBooleanExample() {
  const retain = false
  doBool({ op: boolOpName, arg: objectHeld.userData.csg, retain })
}

async function init() {
  initSqueezableBounds()
  csgWorker.busy = false
  doBool({ op: "init", arg: totalCSG })
  window.csgWorker = csgWorker
  vrRoom.onRender( async (delta, frame, renderer) => {
    // if (!cubeHeld) {
    //   return
    // }
    const baseObject = objectHeld.userData.baseObject
    objectHeld.userData.csg = transform(objectHeld.matrixWorld.toArray(), baseObject)
    updateBooleanExample()
  })
}

init().then()
