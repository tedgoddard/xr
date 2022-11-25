import { Vector3, MeshLambertMaterial, Mesh, BoxGeometry } from "./js/three.module.js"
import { VRRoom, ivory, logFlash } from "./vrroom.js"

const vrRoom = new VRRoom({ disableBackground: true, disableGrid: true })
const scene = vrRoom.scene
const THREE = vrRoom.THREE
let currentSelect = null
let video1 = null
let video2 = null
let screen1 = null
let screen2 = null
let source1 = null
let source2 = null
const buttons = []

let stereoSeparation = 0
let stereoIndex = 0

const whiteFrame = new MeshLambertMaterial({ color: ivory, })
whiteFrame.transparent = true
whiteFrame.opacity = 0.3

async function loadImageButton(image, options) {
  const mesh = await vrRoom.loadTexturePanel(image)
  // mesh.rotation.x = -vrRoom.halfPi
  mesh.position.copy(options.position)
  mesh.scale.copy(options.scale)
  scene.add(mesh)
  return mesh
}

function loadVideo() {
  const geometry = new THREE.PlaneGeometry(2, 2)

  video1 = document.getElementById('video1')
  source1 = document.getElementById('source1')
  const texture1 = new THREE.VideoTexture(video1)
  const material1 = new THREE.MeshBasicMaterial({ map: texture1 })
  screen1 = new THREE.Mesh(geometry, material1)
  // screen1.layers.set(1)
  screen1.position.set(0, 1, -2)
  scene.add(screen1)

  video2 = document.getElementById('video2')
  source2 = document.getElementById('source2')
  const texture2 = new THREE.VideoTexture(video2)
  const material2 = new THREE.MeshBasicMaterial({ map: texture2 })
  screen2 = new THREE.Mesh(geometry, material2)
  // screen2.layers.set(2)
  screen2.position.set(0, 1, -2)
  scene.add(screen2)
}

const channels = [
  "0094", "0131", "0171", "0193", "0211", "0304", "0335", "1600", "1700"
]

const buttonDefaults = {
  scale: new Vector3(0.04, 0.04, 1),
}

function adjustStereo() {
  stereoIndex = (stereoIndex + 1) % 10
  stereoSeparation = stereoIndex * 0.5
  video1.currentTime = video2.currentTime + stereoSeparation
  console.log(`times: ${stereoIndex} ${stereoSeparation} ${video1.currentTime} ${video2.currentTime}`)
}

function highlightBox(object) {
  const boxGeometry = new BoxGeometry(0.4, 0.4, 0.1)
  const box = new Mesh(boxGeometry, whiteFrame)
  box.position.copy(object.position)
  scene.add(box)
  box.visible = false
  return box
}

async function initButtons() {
  let i = 0
  for (let x of [1.5, 2, 2.5]) {
    for (let y of [1.5, 1, 0.5]) {
      const channel = channels[i++]
      
      const button = await loadImageButton(`images/sdo_${channel}.jpg`, 
        { ...buttonDefaults, position: new Vector3(x, y, 0) })
      button.userData.event = channel
      button.userData.highlightObject = highlightBox(button)
      vrRoom.pointerUpObjects.push(button)
      buttons.push(button)
    }
  }

  const stereoButton = await loadImageButton(`images/eyes.png`,
    { ...buttonDefaults, position: new Vector3(3, 0.5, 0) })
  stereoButton.userData.event = "stereo"
  stereoButton.userData.highlightObject = highlightBox(stereoButton)
  vrRoom.pointerUpObjects.push(stereoButton)
  buttons.push(stereoButton)
}

const eventHandlers = {
  stereo: adjustStereo,
}

async function doEvent(target) {
  const event = target?.userData?.event
  const handler = eventHandlers[event]
  if (handler) {
    handler()
    return
  }

  const channel = event
  const src = `../sdo/sample-${channel}.mp4`
  source1.src = src
  source2.src = src

  const currentTime1 = video1.currentTime
  video1.load()
  video1.currentTime = currentTime1

  const currentTime2 = video2.currentTime
  video2.load()
  video2.currentTime = currentTime2

  console.log(source1)
}

vrRoom.onSessionStarted((session) => {
  screen1.layers.set(1)
  screen2.layers.set(2)
})

vrRoom.onPointerUp( async (position, intersects) => {
  const target = intersects[0]?.object
  await doEvent(target)
})

vrRoom.addSelectListener(async () => {
  const target = currentSelect?.object?.userData?.object
  await doEvent(target)
})

document.addEventListener( 'click', function () {
  video1.play().then(() => {
    console.log("video1 playing")
  })
  video2.play().then(() => {
    console.log("video2 playing")
  })
  video1.currentTime = video2.currentTime + stereoSeparation
  setInterval(() => {
    video1.play()
    video2.play()
  }, 1000)
})

function pointerListener(hits) {
  currentSelect = hits[0][0] || hits[1][0]
  if (currentSelect) {
    const object = currentSelect.object.userData.object
    const highlightObject = object.userData.highlightObject
    highlightObject.visible = true
    setTimeout(() => { highlightObject.visible = false }, 100)
  }
}

async function init() {
  await initButtons()
  loadVideo()
  await doEvent({ userData: { event: "0131" } })
  vrRoom.addPointerListener([...buttons], pointerListener)
}

init().then()
