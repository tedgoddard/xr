import { VRRoom, logFlash } from "./vrroom.js"
import * as THREE from './js/three.module.js';
import * as BufferGeometryUtils from './jsm/utils/BufferGeometryUtils.js'

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene

const baseURL = "../point_e_models"

async function sleep(millis) {
  return new Promise( (resolve, reject) => {
    window.setTimeout(resolve, millis)
  })
}

async function loadFloor() {
  const ring1 = new THREE.RingGeometry(1.95, 2, 32)
  const ring2 = new THREE.RingGeometry(0.95, 1, 32)
  const geometry = BufferGeometryUtils.mergeBufferGeometries([ring1, ring2])
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

function buildModel(model) {

  const positions = []
  const colors = []

  const { coords, channels } = model
  for (let i = 0; i < coords.length; i++) {
    const r = channels.R[i]
    const g = channels.G[i]
    const b = channels.B[i]
    colors.push(r, g, b)
    positions.push(...coords[i])
  }

  const geometry = new THREE.BufferGeometry()

  if (positions.length > 0) geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3))
  // if ( normal.length > 0 ) geometry.setAttribute( 'normal', new Float32BufferAttribute( normal, 3 ) );
  if (colors.length > 0) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  // if ( intensity.length > 0 ) geometry.setAttribute( 'intensity', new Float32BufferAttribute( intensity, 1 ) );
  // if ( label.length > 0 ) geometry.setAttribute( 'label', new Int32BufferAttribute( label, 1 ) );

  geometry.computeBoundingSphere()
  const material = new THREE.PointsMaterial({ size: 0.01 })

  if (colors.length > 0) {
    material.vertexColors = true
  }

  return new THREE.Points(geometry, material)
}

async function init() {
  const modelIndex = await (await fetch(`${baseURL}/index.json`)).json()
  await loadFloor()

  for (const name of modelIndex) {
    const modelResponse = await fetch(`${baseURL}/${name}`)
    const modelData = await modelResponse.json()
    const model = buildModel(modelData)
    scene.add(model)
    await sleep(5000)
    scene.remove(model)
  }

}

init().then()
