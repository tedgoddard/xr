import { VRRoom, logFlash } from "./vrroom.js"
import { BoxGeometry, Mesh, MeshStandardMaterial, MeshBasicMaterial, MeshPhongMaterial, Clock } from './js/three.module.js'
import { DragControls } from './jsm/controls/DragControls.js'

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
const boxGeometry = new BoxGeometry( 1, 1, 1 );
const greenFrame = new MeshStandardMaterial({ color: 0x00ff00, wireframe: true })
const redFrame = new MeshStandardMaterial({ color: 0xff0000, wireframe: true })
const greenCube = new Mesh( boxGeometry, greenFrame )
const redCube = new Mesh( boxGeometry, redFrame )
scene.add(greenCube)
scene.add(redCube)

greenCube.userData.csg = baseCube
redCube.userData.csg = baseCube

const draggables = [
  greenCube, redCube
]
const controls = new DragControls( draggables, vrRoom.camera, vrRoom.renderer.domElement );
vrRoom.controls.enabled = false

controls.addEventListener( 'dragstart', function ( event ) {
	event.object?.material?.emissive?.set( 0xaaaaaa )
})

controls.addEventListener( 'drag', function ( event ) {
  const csg = baseCube
  if (csg) {
    event.object.userData.csg = translate(event.object.position.toArray(), csg)
    updateBooleanExample()
  }
})

controls.addEventListener( 'hoveron', function ( event ) {
  vrRoom.controls.enabled = false
})

controls.addEventListener( 'hoveroff', function ( event ) {
  vrRoom.controls.enabled = true
})

controls.addEventListener( 'dragend', function ( event ) {
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

function updateBooleanExample() {
  const now = clock.getElapsedTime()
  const csgGeometry = csg2geom(subtract(greenCube.userData.csg, redCube.userData.csg))

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
