import { VRRoom, logFlash } from "./vrroom.js"
import { BoxGeometry, Mesh, MeshStandardMaterial, MeshBasicMaterial, MeshPhongMaterial, Clock } from './js/three.module.js'
import { DragControls } from './jsm/controls/DragControls.js'
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

const vrRoom = new VRRoom()
const scene = vrRoom.scene
const clock = new Clock()
clock.start()

const baseCube = cube({ size: 1 })
const floorCube = cuboid({ size: [10, 0.5, 10] })
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

const draggables = [
  greenCube, redCube
]
// const controls = new DragControls( draggables, vrRoom.camera, vrRoom.renderer.domElement );
vrRoom.controls.enabled = false

// controls.addEventListener( 'dragstart', function ( event ) {
// 	event.object?.material?.emissive?.set( 0xaaaaaa )
// })

// controls.addEventListener( 'drag', function ( event ) {
//   const csg = baseCube
//   if (csg) {
//     event.object.userData.csg = translate(event.object.position.toArray(), csg)
//     updateBooleanExample()
//   }
// })

// controls.addEventListener( 'hoveron', function ( event ) {
//   vrRoom.controls.enabled = false
// })

// controls.addEventListener( 'hoveroff', function ( event ) {
//   vrRoom.controls.enabled = true
// })

// controls.addEventListener( 'dragend', function ( event ) {
// })




const transformControl = new TransformControls(vrRoom.camera, vrRoom.renderer.domElement)
transformControl.addEventListener('dragging-changed', event => {
  vrRoom.controls.enabled = !event.value
  if (!event.value) {
    console.log(redCube.position)
    // const csg = baseCube
    // if (csg) {
    //   event.object.userData.csg = translate(event.object.position.toArray(), csg)
    //   updateBooleanExample()
    // }
  }
})

transformControl.addEventListener('objectChange', () => {
  const csg = baseCube
  if (csg) {
    const rotated = rotate(redCube.rotation.toArray(), csg)
    redCube.userData.csg = translate(redCube.position.toArray(), rotated)
    updateBooleanExample()
  }
})

scene.add(transformControl)

transformControl.attach(redCube)
transformControl.setMode('rotate')



document.addEventListener('keyup', event => {
  console.log(event)
  if (event.code?.toLowerCase() == 'space') {
    totalCSG = subtract(totalCSG, redCube.userData.csg)
    console.log("subtracted")
  }
})

let geomMesh = null

async function loadFloor() {
  const mesh = await vrRoom.loadTexturePanel("images/concrete.jpg")
  mesh.rotation.x = -vrRoom.halfPi
  mesh.position.y = 0.01
  const mesh1 = mesh.clone()
  mesh.position.z = -5
  mesh1.position.z = 5
  scene.add(mesh)
  scene.add(mesh1)
}

vrRoom.onSelect((time, controller) => {
  totalCSG = subtract(totalCSG, redCube.userData.csg)
})

vrRoom.onSqueeze((time, controller) => {
  controller.add(redCube)
})

vrRoom.onSqueezeEnd((time, controller) => {
  const cubeWorld = redCube.localToWorld(new THREE.Vector3())
  scene.add(redCube)
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
  await loadFloor()
  await updateBooleanExample()
  vrRoom.onRender( async (delta, frame, renderer) => {
  })
}

init().then()
