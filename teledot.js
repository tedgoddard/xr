import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const cameraOptions = { fov: 50, near: 0.01, far: 1000 }
const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true, camera: cameraOptions })
const scene = vrRoom.scene

const s = window.location.protocol == "https:" ? "s" : ""
const webSocket = new WebSocket(`ws${s}://${window.location.host}/room`)

async function loadFloor() {
  const geometry = new THREE.RingGeometry(1.95, 2, 32)
  geometry.merge(new THREE.RingGeometry(0.95, 1, 32))
  const material = new THREE.MeshBasicMaterial({ color: 0x660000, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = vrRoom.halfPi
  scene.add(mesh)  
}

function swap16(x) {
  return ((x & 0xFF) << 8) | ((x >> 8) & 0xFF)
}

const pow = Math.pow
function decodeFloat16(binary) {
  const exponent = (binary & 0x7C00) >> 10
  const fraction = binary & 0x03FF
  return (binary >> 15 ? -1 : 1) * (
    exponent ? (
      exponent === 0x1F ?
      fraction ? NaN : Infinity :
      pow(2, exponent - 15) * (1 + fraction / 0x400)
    ) : 6.103515625e-5 * (fraction / 0x400)
  )
}

async function init() {

  await loadFloor()

  const skinGeometry = new THREE.BufferGeometry()

  const skinVertices = []
  const skinColors = []
  const skinSizes = []
  for (let x = 0; x < 640; x++) {
    for (let y = 0; y < 480; y++) {
      skinVertices.push(...[x / 250, y / 250, 0.5])
      skinColors.push(0.8, 0.4, 0.4)
      skinSizes.push(0.025)
    }
  }
  skinGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skinVertices, 3).setUsage(THREE.DynamicDrawUsage))
  skinGeometry.setAttribute('color', new THREE.Float32BufferAttribute(skinColors, 3).setUsage(THREE.DynamicDrawUsage))
  skinGeometry.setAttribute('size', new THREE.Float32BufferAttribute(skinSizes, 1))
  const skinSystem = new THREE.Points(skinGeometry, vrRoom.particleShaderMaterial)
  skinSystem.rotation.z = -vrRoom.halfPi
  skinSystem.position.y = 2
  skinSystem.position.x = 0

  scene.add(skinSystem)

  webSocket.onmessage = async (message) => { 
    const messageBuffer = await message.data.arrayBuffer()
    const depthBuffer = messageBuffer.slice(0, 614464)
    const colorBuffer = messageBuffer.slice(614464)
    const depthView = new Int16Array(depthBuffer)
    const colorView = new Uint8Array(colorBuffer)

    const positions = skinGeometry.attributes.position.array
    const colors = skinGeometry.attributes.color.array
    for (let x = 0; x < 640; x++) {
      for (let y = 0; y < 480; y++) {
        const i = (x + y * 640) * 3
        const z = decodeFloat16(depthView[x + y * 640]) * 8
        positions[i] = x / 250
        positions[i + 1] = y / 250
        positions[i + 2] = z
        colors[(x + y * 640) * 3] = colorView[(x + y * 640) * 4] / 255
        colors[(x + y * 640) * 3 + 1] = colorView[(x + y * 640) * 4 + 1] / 255
        colors[(x + y * 640) * 3 + 2] = colorView[(x + y * 640) * 4 + 2] / 255
      }
    }
    skinGeometry.attributes.position.needsUpdate = true
    skinGeometry.attributes.color.needsUpdate = true
  }
}

init().then()
