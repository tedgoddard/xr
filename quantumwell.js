import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js'
import { Schrodinger } from './schrodinger.js'
import { TransformControls } from './jsm/controls/TransformControls.js'

window.THREE = THREE

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
window.vrRoom = vrRoom
const scene = vrRoom.scene

const schrodinger = new Schrodinger()

let spline = null
const splinePoints = [
  new THREE.Vector3(-1, 1, 0),
  new THREE.Vector3(-0.5, 0.5, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.5, 0.5, 0),
  new THREE.Vector3(0.6, 0.7, 0),
  new THREE.Vector3(1, 1, 0)
]
const splinePointsLength = splinePoints.length
const splineHelperObjects = []

let energyControl = null
let energyPlane = null
let energyLabel = null
function addEnergyControl() {
  const geometry = new THREE.BoxBufferGeometry(0.05, 0.05, 0.05)
  const material = new THREE.MeshLambertMaterial({ color: 'yellow' })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-1.5, 0, 0)
  scene.add(mesh)
  vrRoom.pointerDownObjects.push(mesh)
  energyControl = mesh
  energyPlane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(0.5, 8, 8, 8),
    new THREE.MeshBasicMaterial( { color: 0xFFFFFF, alphaTest: 0, visible: false })
  )
  energyPlane.position.set(-1.5, 0, 0)
  vrRoom.pointerMoveObjects.push(energyPlane)
  scene.add(energyPlane)
}
addEnergyControl()

for (let i = 0; i < splinePointsLength; i++) {
  const geometry = new THREE.BoxBufferGeometry(0.05, 0.05, 0.05)
  const material = new THREE.MeshLambertMaterial({ color: 'green' })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(splinePoints[i])
  mesh.userData.i = i
  scene.add(mesh)
  splineHelperObjects.push(mesh)
  vrRoom.pointerMoveObjects.push(mesh)
}

async function setEnergyLabel(E) {
  if (energyLabel) {
    scene.remove(energyLabel)
  }
  energyLabel = await vrRoom.loadText(E.toFixed(2), { xsize: 0.1})
  THREE.GeometryUtils.center(energyLabel.geometry)
  energyLabel.position.set(-1.5, -0.1, 0)
  energyLabel.scale.set(0.3, 0.3, 0.3)
  scene.add(energyLabel)
}

vrRoom.onPointerUp( position => {
  vrRoom.orbitControls.enabled = true
  if (energyControl.userData.dragging) {
    const E = 100 * energyControl.position.y
    schrodinger.E = E
    schrodinger.search()
    energyControl.userData.dragging = false
    setEnergyLabel(E)
  }
})

vrRoom.onPointerDown( (position, intersects) => {
  const object = intersects[0]?.object
  if (object == energyControl) {
    vrRoom.orbitControls.enabled = false
    energyControl.userData.dragging = true
    return
  }
})

vrRoom.onPointerMove((position, intersects) => {
  const energyPlaneIntersect = intersects.find( intersect => intersect.object == energyPlane )
  if (energyPlaneIntersect) {
    if (energyControl.userData.dragging) {
      energyControl.position.y = energyPlaneIntersect.point.y
    }
    return
  }

  const object = intersects[0]?.object
  if (object !== transformControl.object) {
    transformControl.attach(object)
  }
})
const transformControl = new TransformControls(vrRoom.camera, vrRoom.renderer.domElement)
transformControl.addEventListener('dragging-changed', event => {
  vrRoom.orbitControls.enabled = !event.value
  if (!event.value) {
    schrodinger.E = 100 * energyControl.position.y
    schrodinger.search()
  }
})

transformControl.addEventListener('objectChange', () => {
  updateSplineOutline()
})

scene.add(transformControl)

const ARC_SEGMENTS = 50

function updateSplineOutline() {
  const point = new THREE.Vector3()

  for (let i = 0; i < splinePointsLength; i++) {
    splinePoints[i].copy(splineHelperObjects[i].position)   
  }

  const splineMesh = spline.mesh
  const position = splineMesh.geometry.attributes.position

  for ( let i = 0; i < ARC_SEGMENTS; i ++ ) {

    const t = i / ( ARC_SEGMENTS - 1 )
    spline.getPoint(t, point)
    position.setXYZ( i, point.x, point.y, point.z )
  }

  position.needsUpdate = true;

}


function Vbowl(x) {
  return 30 * ((x - 0.5)**2)
}

function Vplateau(x) {
  if (x > 0.2 && x < 0.3) {
    return 50
  }
  if (x > -0.3 && x < -0.2) {
    return 50
  }

  return 0
}

function Vcurve(x) {
  const point = new THREE.Vector3()
  const t = (x + schrodinger.xmax) / 2
  spline.getPoint(t, point)
  return point.y * 50
}

schrodinger.V = Vcurve
schrodinger.E = 1

let graph = null

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

function makeSpline() {
  spline = new THREE.CatmullRomCurve3(splinePoints)
  const points = spline.getPoints(ARC_SEGMENTS)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({ color : 0x5555AA})
  const mesh = new THREE.Line(geometry, material)
  spline.mesh = mesh
  scene.add(mesh)
}

function makePoints() {
  const geometry = new THREE.BufferGeometry()
  const material = vrRoom.particleShaderMaterial
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute([], 3).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1).setUsage(THREE.DynamicDrawUsage))
  const points = new THREE.Points(geometry, material)  
  return points
}

function drawGraph(f) {
  const vertices = f.map( (y, i) => [2 * i / f.length - 1, y, 0]).flat()
  const colors = f.map( y => [0.9, 0.1, 0.4]).flat()
  const sizes = f.map( y => 0.05)
  graph.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage))
  graph.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage))
  graph.geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

  graph.geometry.attributes.position.needsUpdate = true
  graph.geometry.attributes.color.needsUpdate = true
  graph.geometry.attributes.size.needsUpdate = true
}

vrRoom.onRender( (delta, frame, renderer) => {
    schrodinger.step()
    drawGraph(schrodinger.data)
} )

async function init() {
  await loadFloor()
  makeSpline()
  graph = makePoints()
  scene.add(graph)
}

init().then()
