import { VRRoom, logFlash } from "./vrroom.js"
import { Euler, Quaternion, Vector3, BoxGeometry, Mesh, MeshStandardMaterial, MeshBasicMaterial, MeshPhongMaterial, Clock } from './js/three.module.js'
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
const { translate, rotate, scale } = Modeling.transforms
const { intersect, subtract, union } = Modeling.booleans

const greyMaterial = new MeshPhongMaterial( { color: 0x888888, flatShading: false } )
const theQuaternion = new Quaternion()
const theEuler = new Euler()
const thePosition = new Vector3()

const vrRoom = new VRRoom()
const scene = vrRoom.scene
const clock = new Clock()
clock.start()

const baseCube = cube({ size: 1 })
const floorCube = cuboid({ size: [10, 2, 10] })
let totalCSG = floorCube

const boxGeometry = new BoxGeometry( 1, 1, 1 );
const greenFrame = new MeshStandardMaterial({ color: 0x00ff00, wireframe: true })
const redFrame = new MeshStandardMaterial({ color: 0xff0000, wireframe: true })
const greenCube = new Mesh( boxGeometry, greenFrame )
const redCube = new Mesh( boxGeometry, redFrame )
scene.add(greenCube)
scene.add(redCube)

greenCube.position.x = 2
greenCube.position.z = 2
greenCube.userData.csg = baseCube
redCube.userData.csg = baseCube

const transformControl = new TransformControls(vrRoom.camera, vrRoom.renderer.domElement)
transformControl.addEventListener('dragging-changed', event => {
  vrRoom.controls.enabled = !event.value
})
scene.add(transformControl)
transformControl.attach(redCube)

document.addEventListener('keyup', event => {
  if (event.code?.toLowerCase() == 'space') {
    totalCSG = subtract(totalCSG, redCube.userData.csg)
    console.log("subtracted")
  }
  if (event.code?.toLowerCase() == 'keyr') {
    transformControl.setMode('rotate')
  }
  if (event.code?.toLowerCase() == 'keyt') {
    transformControl.setMode('translate')
  }
})

let geomMesh = null

vrRoom.onSelect((time, controller) => {
  totalCSG = subtract(totalCSG, redCube.userData.csg)
})

let cubeHeld = false

vrRoom.onSqueeze((time, controller) => {
  controller.attach(redCube)
  cubeHeld = true
})

vrRoom.onSqueezeEnd((time, controller) => {
  cubeHeld = false
  const cubeWorld = redCube.localToWorld(new THREE.Vector3())
  scene.attach(redCube)
  redCube.position.set(cubeWorld)
})


function updateBooleanExample() {
  const now = clock.getElapsedTime()
  const csgGeometry = csg2geom(subtract(totalCSG, redCube.userData.csg))
  // const csgGeometry = csg2geom( redCube.userData.csg)

  if (!geomMesh) {
    geomMesh = new Mesh(csgGeometry, greyMaterial)
    geomMesh.castShadow = true
    scene.add(geomMesh)
  } else {
    geomMesh.geometry.dispose()
    geomMesh.geometry = csgGeometry
  }
}

async function init() {
  await updateBooleanExample()
  vrRoom.onRender( async (delta, frame, renderer) => {
    // if (!cubeHeld) {
    //   return
    // }
    const csg = baseCube
    redCube.getWorldPosition(thePosition)
    redCube.getWorldQuaternion(theQuaternion)
    theEuler.setFromQuaternion(theQuaternion)
    const rotated = rotate(theEuler.toArray(), csg)
    redCube.userData.csg = translate(thePosition.toArray(), rotated)
    updateBooleanExample()

  })
}

init().then()
