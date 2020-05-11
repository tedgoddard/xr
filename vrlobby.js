import { VRRoom, logFlash } from "./vrroom.js"

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let knifeLabel = null
let tsoob = null
let rifleLabel = null
let currentSelect = null
let currentURL = null

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

async function addRifleLabel() {
  rifleLabel = await vrRoom.loadText("Assault\n  Rifle")
  rifleLabel.position.x -= 0.5
  rifleLabel.position.z = -4
  rifleLabel.position.y = 3
  rifleLabel.userData.url = "assault.html"
  window.rifleLabel = rifleLabel
  scene.add(rifleLabel)
}

async function addKnifeLabel() {
  knifeLabel = await vrRoom.loadText(" Knife\nThrow")
  knifeLabel.position.x -= 2
  knifeLabel.position.z = -4
  knifeLabel.position.y = 1.5
  knifeLabel.rotation.y =+ vrRoom.halfPi / 2
  knifeLabel.userData.url = "knifethrow.html"
  window.knifeLabel = knifeLabel
  scene.add(knifeLabel)
}

async function addThumbBody() {
  tsoob = await vrRoom.loadText("Thumbstick\nOut of Body")
  tsoob.position.x += 2
  tsoob.position.z = -4
  tsoob.position.y = 1.5
  tsoob.rotation.y =  -vrRoom.halfPi / 2
  tsoob.userData.url = "thumbstickoob.html"
  scene.add(tsoob)
}

async function init() {
  await loadFloor()
  await addKnifeLabel()
  await addThumbBody()
  await addRifleLabel()
  vrRoom.addPointerListener([knifeLabel, rifleLabel, tsoob], (hits) => {
    currentSelect = hits[0][0] || hits[1][0]
    if (currentSelect) {
      const object = currentSelect.object.userData.object
      currentURL = object.userData.url
      let material = object.material
      material = material[1] || material
      if (!object.userData.color) {
        // object.userData.color = material.color
        object.userData.color = { r: 0.53333, g: 0.53333, b: 0.53333}
      }
      material.color.r = 1
      setTimeout(() => { material.color.r = object.userData.color.r }, 100)
    }
  })
  vrRoom.addSelectListener(async () => {
    await vrRoom.endSession()
    window.location = currentURL
  })
}

init().then()
