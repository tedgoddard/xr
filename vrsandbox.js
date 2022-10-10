import { VRRoom, ivory, ebony, ensureHelvetiker, logFlash } from "./vrroom.js"
import {
  Euler, Quaternion, Vector3, Box3, Matrix4,
  BoxGeometry, TetrahedronGeometry, SphereGeometry, 
  Mesh, MeshStandardMaterial,
  MeshBasicMaterial, MeshPhongMaterial, Color, Clock
} from './js/three.module.js'
import { BoxBufferGeometry } from './js/three.module.js'
import { TransformControls } from './jsm/controls/TransformControls.js'

import "./js/jscad-modeling.min.js"
import { csg2geom } from "./csg2geom.js"
import { table } from "./qwerty.js"
import polyInfo from "./poly-info.js"

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
const theSize = new Vector3()
const theMatrix = new Matrix4()
const theBox = new Box3()
let currentModels = []
let currentModel = null
let currentModelIndex = 0
const tiles = []
const tileObjects = []
let tileFronts = []
const blinkModelParts = false
let currentSelect = null

if (blinkModelParts) {
  setInterval(() => {
    if (!blinkModelParts) {
      return
    }
    if (!currentModel) {
      return
    }
    let objectCursor = currentModel
    while (objectCursor.children.length > 0) {
      const children = objectCursor.children
      objectCursor = children[Math.floor(children.length * Math.random())]
    }
    objectCursor.visible = Math.random() > 0.5
  }, 250)
}

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
greenBall.userData.isDraggable = true
redCube.userData.isDraggable = true
scene.add(greenBall)
scene.add(redCube)

const tetrahedronGeometry = new TetrahedronGeometry(.1)

const markerGeometry = new BoxGeometry(.1, .1, .1)
const markerBox = new Mesh( markerGeometry, redFrame )
scene.add(markerBox)

// let objectHeld = redCube
let objectHeld = null
let csgTool = redCube
const objectHeldTransform = new Matrix4()
let refreshCSG = true

const blackBox = new Mesh(markerGeometry, ebony.clone())
blackBox.position.set(2, 1, 2)
scene.add(blackBox)
blackBox.userData.event = "subtract"
vrRoom.pointerUpObjects.push(blackBox)

const whiteBox = new Mesh(markerGeometry, ivory.clone())
whiteBox.position.set(2.3, 1, 2)
scene.add(whiteBox)
whiteBox.userData.event = "union"
vrRoom.pointerUpObjects.push(whiteBox)

const upArrow = new Mesh(tetrahedronGeometry, ivory.clone())
upArrow.position.set(0, 1, 2)
upArrow.rotation.set(0.6, 0, 2.4)
upArrow.userData.event = "up"
scene.add(upArrow)
vrRoom.pointerUpObjects.push(upArrow)

const downArrow = new Mesh(tetrahedronGeometry, ivory.clone())
downArrow.position.set(0, 0.8, 2)
downArrow.rotation.set(0.6, 0, -2.4)
downArrow.userData.event = "down"
scene.add(downArrow)
vrRoom.pointerUpObjects.push(downArrow)

const squeezables = [greenBall, redCube, blackBox, whiteBox, upArrow, downArrow]

greenBall.position.x = 2
greenBall.position.z = 2
greenBall.userData.baseObject = baseBall
redCube.userData.baseObject = baseCube
greenBall.userData.csg = baseBall
redCube.userData.csg = baseCube

const max = array => array.reduce((a, x) => Math.max(a, x))
  
function doBool(message) {
  if (csgWorker.busy) {
    return
  }
  csgWorker.busy = true
  csgWorker.postMessage(message)
}

// strangely, does not work in VR
function updateObjectHeldTransform() {
  objectHeld.updateMatrixWorld()
  const objectHeldMatrix = objectHeld.matrixWorld
  objectHeldTransform.extractRotation(objectHeldMatrix)
  objectHeldTransform.copyPosition(objectHeldMatrix)
}

const transformControl = new TransformControls(vrRoom.camera, vrRoom.renderer.domElement)
transformControl.addEventListener('dragging-changed', event => {
  vrRoom.controls.enabled = !event.value
  const retain = false
  if (!objectHeld) {
    return
  }
  doBool({ op: boolOpName, arg: objectHeld?.userData?.csg, retain })
  console.log("transform is done")
  console.log(objectHeld.position)
  console.log("matched squeezable", matchSqueezable(objectHeld))
  updateObjectHeldTransform()
})
transformControl.addEventListener('change', event => {
  const retain = false
  doBool({ op: boolOpName, arg: objectHeld?.userData?.csg, retain })
})

scene.add(transformControl)
// transformControl.attach(redCube)

document.addEventListener('keyup', event => {
  if (event.code?.toLowerCase() == 'space') {
    if (objectHeld?.userData?.isModel) {
      scene.add(objectHeld.clone())
      return
    }
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


function makeBoxMesh(box) {
  const dimensions = new Vector3().subVectors( box.max, box.min );
  const boxGeo = new BoxBufferGeometry(dimensions.x, dimensions.y, dimensions.z);
  
  // move new mesh center so it's aligned with the original object
  const matrix = new Matrix4().setPosition(dimensions.addVectors(box.min, box.max).multiplyScalar( 0.5 ));
  boxGeo.applyMatrix(matrix)
  return new Mesh(boxGeo, new MeshBasicMaterial( { color: 0xffcc55 } ));
}

function initSqueezableBounds() {
  for (const squeezable of squeezables) {
    theBox.setFromObject(squeezable)
    squeezable.userData.boundingBox = theBox.clone()
  }
}

function matchSqueezable(controller) {
  const controllerWorld = controller.localToWorld(new Vector3())
  for (const squeezable of squeezables) {
    const boundingBox = squeezable.userData?.boundingBox ?? squeezable.geometry?.boundingBox
    // theBox.copy(boundingBox).applyMatrix4(squeezable.matrixWorld)
    theBox.copy(boundingBox)
    if (theBox.containsPoint(controllerWorld)) {
      // const markerBox = makeBoxMesh(theBox)
      // scene.add(markerBox)
      return squeezable
    }
  }
  return null
}


vrRoom.onSelectEnd((time, controller) => {
  console.log("end select")
  //TODO: Factor out
  if (objectHeld?.userData?.isModel) {
    const clone = objectHeld.clone()
    const objectHeldWorld = objectHeld.localToWorld(new Vector3())
    objectHeld.getWorldQuaternion(theQuaternion)
    clone.userData.isDraggable = true
    clone.userData.isModel = true
    scene.add(clone)
    clone.position.copy(objectHeldWorld)
    clone.setRotationFromQuaternion(theQuaternion)
    squeezables.push(clone)
    theBox.setFromObject(clone)
    clone.userData.boundingBox = theBox.clone()
    return
  }
  const retain = true
  csgWorker.busy = false
  doBool({ op: boolOpName, arg: csgTool.userData.csg, retain })
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
  if (squeezable.userData?.isDraggable) {
    console.log("grabbed", squeezable)
    objectHeld = squeezable
    controller.attach(objectHeld)
  }
  if (squeezable.userData?.csg) {
    csgTool = squeezable
  }
})

vrRoom.onSqueezeEnd(async (time, controller) => {
  if (objectHeld) {
    console.log("dropping", objectHeld)
    scene.attach(objectHeld)
    theBox.setFromObject(objectHeld)
    objectHeld.userData.boundingBox = theBox.clone()
    console.log("dropped", objectHeld)
    objectHeld = null
  }

  const controllerWorld = controller.localToWorld(new Vector3())
  markerBox.position.copy(controllerWorld)

  const squeezable = matchSqueezable(controller)

  const event = squeezable?.userData?.event ?? squeezable?.userData?.parent?.userData?.event
  if (event) {
    await pointerUpHandlers[event]()
    return
  }

})

const pointerUpHandlers = {
  up: async () => { 
    currentModelIndex += 1
    await updateModel()
  },
  down: async () => { 
    currentModelIndex -= 1
    await updateModel()
  }
}

vrRoom.onPointerUp( async (position, intersects) => {
  console.log("pointerUp", intersects)
  const object = intersects[0]?.object
  const event = object?.userData?.event ?? object?.userData?.parent?.userData?.event
  // logFlash(`pointerUp ${event}`, 10)
  if (event) {
    await pointerUpHandlers[event]()
  }
})

function normalizeModel(theModel) {
  theBox.setFromObject(theModel)
  const maxSize = max(theBox.getSize(theSize).toArray())
  const shrink = 1 / maxSize
  theModel.scale.multiplyScalar(shrink)
}

let modelLoading = false
async function loadModel(index) {
  if (modelLoading) {
    return
  }
  modelLoading = true
  const count = currentModels.length
  const i = ((index % count) + count) % count
  const modelInfo = currentModels[i]
  if (!modelInfo) {
    modelLoading = false
    return
  }
  const modelPath = modelInfo.Download
  // const url = `/glb/${modelPath}`
  const url = `https://tedgoddard.github.io/google_poly/glb/${modelPath}`
  const theModel = await vrRoom.loadModel(url)
  normalizeModel(theModel)
  theBox.setFromObject(theModel)
  theModel.userData.boundingBox = theBox.clone()
  console.log(modelInfo)
  modelLoading = false
  theModel.name = modelInfo.Title
  return theModel
}

function updateBooleanExample() {
  const retain = false
  doBool({ op: boolOpName, arg: csgTool.userData.csg, retain })
}

async function updateModel() {
  const oldModel = currentModel
  currentModel = await loadModel(currentModelIndex)
  if (!currentModel) {
    return
  }
  if (oldModel) {
    currentModel.applyMatrix4(oldModel.matrixWorld)
    normalizeModel(currentModel)
    transformControl.detach(oldModel)
    scene.remove(oldModel)
    squeezables.splice(squeezables.findIndex(x => x == oldModel), 1)
  }
  scene.add(currentModel)
  // currentModel.applyMatrix4(objectHeldTransform)
  if (!vrRoom.session) {
    transformControl.attach(currentModel)
    objectHeld = currentModel
  }
  currentModel.userData.isModel = true
  currentModel.userData.isDraggable = true
  // TODO PUT BACK SO WE CAN GRAB THE RABBIT
  squeezables.push(currentModel)
  currentModel.geometry?.computeBoundingBox()
  theBox.setFromObject(currentModel)
  currentModel.userData.boundingBox = theBox.clone()
}

async function findAndLoadModel() {
  const exactCandidates = []
  const closeCandidates = []
  const candidates = []
  const text = currentText.text
  const exactMatcher = new RegExp(`^ *${text} *$`, "i")
  const matcher = new RegExp(`.*${text}.*`, "i")
  for (const info of polyInfo) {
    if (info.Title.match(exactMatcher)) {
      exactCandidates.push(info)
      continue
    }
    if (info.Title.match(matcher)) {
      closeCandidates.push(info)
      continue
    }
    for (const tag of info.Tags) {
      if (tag.match(exactMatcher)) {
        candidates.unshift(info)
        continue
      }
      if (tag.match(matcher)) {
        candidates.push(info)
        continue
      }  
    }
  }
  const result = [...exactCandidates, ...closeCandidates, ...candidates]
  currentModels = result
  await updateModel()
}

const currentText = {
  text: "rabbit",
  mesh: null,
  position: [-4, 2, -2]
}
const debugText = {
  text: "",
  mesh: null,
  position: [ 1, 1, 1]
}

function redrawText(textInfo) {
  if (textInfo.drawnText == textInfo.text) {
    return
  }
  if (textInfo.mesh) {
    scene.remove(textInfo.mesh)
  }
  textInfo.mesh = vrRoom.makeText(textInfo.text)
  // textMesh.scale.set(0.2, 0.2, 0.2)
  textInfo.mesh.position.set(...textInfo.position)
  scene.add(textInfo.mesh)
  textInfo.drawnText = textInfo.text
}

function addKeyboard() {
  const totalRows = table.length
  const tileOptions = { minHeight: 0.6, minWidth: .8, size: 0.05 }
  const maxRowWidth = table[0].length
  for (let y = 0; y < table.length; y++) {
    const row = table[y]
    const rowCenter = (maxRowWidth - row.length) / 2
    for (let x = 0; x < row.length; x++) {
      const text = row[x]
      const material = greyMaterial.clone()
      tileOptions.material = material
      const tile = vrRoom.makeTextTile(text, tileOptions)
      const event = `key-${text}`
      tile.userData.event = event
      pointerUpHandlers[event] = async () => {
        console.log("pointeruphandler", event, text)
        if (objectHeld && vrRoom.session) {
          console.log("skipping ", objectHeld)
          return
        }
        if (text == "<") {
          currentText.text = currentText.text.slice(0, -1)
        } else {
          currentText.text += text
        }
        redrawText(currentText)
        currentModelIndex = 0
        await findAndLoadModel()
      }
      tile.position.set((x + rowCenter) / 2 - 4, (totalRows - y) / 1.5 - 0.5, -2)
      scene.add(tile)
      tiles.push(tile)
      tileObjects[text] = tile
      vrRoom.pointerUpObjects.push(tile)
    }
  }

  tiles.forEach( tile => {
    tile.userData.highlightObject = tile.children[1]
  })

}

async function init() {
  csgWorker.busy = false
  doBool({ op: "init", arg: totalCSG })

  vrRoom.onRender( async (delta, frame, renderer) => {
    const baseObject = csgTool?.userData?.baseObject
    if (baseObject) {
      csgTool.userData.csg = transform(csgTool.matrixWorld.toArray(), baseObject)
      updateBooleanExample()
    }
  })

  await ensureHelvetiker()
  addKeyboard()
  redrawText(currentText)
  redrawText(debugText)
  initSqueezableBounds()
  await findAndLoadModel()
  
  vrRoom.addPointerListener([...vrRoom.pointerUpObjects], (hits) => {
      currentSelect = hits[0][0] || hits[1][0]
    if (currentSelect) {
      const object = currentSelect.object.userData.object ?? object
      const highlightObject = object.userData.highlightObject ?? object
      let material = highlightObject.material
      material = material[1] || material
      if (!highlightObject.userData.color) {
        // object.userData.color = material.color
        highlightObject.userData.color = { r: 0.53333, g: 0.53333, b: 0.53333}
      }
      material.color.r = 1
      setTimeout(() => { material.color.r = highlightObject.userData.color.r }, 100)
    }
  })
  vrRoom.addSelectListener(async () => {
    const object = currentSelect?.object?.userData?.object
    const event = object?.userData?.event
    console.log("selectListener object event", event)
    if (event) {
      await pointerUpHandlers[event]()
    }
  })

}

init().then()
