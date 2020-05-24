import * as THREE from "./js/three.module.js"

const start = Date.now()
let lastUpdate = start

function generateTentacleData() {
  const data = []
  for (let i = 0; i < 10; i++) {
    data.push(Math.random() * 5)
  }
  return data
}

function getTentaclePath(data) {
  const seconds = (Date.now() - start) / 2000
  const x = Math.sin(data[0] * Math.PI * seconds) * data[1]
  const y = Math.sin(data[2] * Math.PI * seconds) * data[3]
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5 - x, y + 10, 0),
    new THREE.Vector3(-data[4], data[5] + 5, 2),
    new THREE.Vector3(2, 3, 1),
    new THREE.Vector3(0, 0, 0),
  ])
  return curve
}

function createTentacle() {
  const material = new THREE.MeshPhongMaterial({ color: 0x006600 })
  const tentacle = new THREE.Mesh(new THREE.Geometry(), material)
  const data = generateTentacleData()
  tentacle.userData.data = data
  updateTentacle(tentacle)
  material.shininess = 80
  material.side = THREE.DoubleSide
  tentacle.scale.set(0.1, 0.1, 0.1)
  return tentacle
}

function updateTentacle(tentacle) {
  const curve = getTentaclePath(tentacle.userData.data)
  tentacle.geometry = new THREE.TubeGeometry( curve, 10, 1, 8, false )
}

export class Creature extends THREE.Object3D {
  constructor() {
    super()

    this.name = "creature"
    const geometry = new THREE.SphereGeometry(2, 8, 8, 0, Math.PI * 2, 0, 1.5)
    const material = new THREE.MeshPhongMaterial({ color: 0x006600 })
    material.shininess = 80
    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.set(0, -1, 0)
    this.add(sphere)

    this.tentacles = []
    for (let i = 0; i < 3; i++) {
      const tentacle = createTentacle()
      tentacle.position.set(i - 1, 0.5, 0)
      this.add(tentacle)
      this.tentacles.push(tentacle)
    }
    this.userData.goal = new THREE.Vector3(0, 0, 0)
    this.userData.speed = 0.01
  }

  update(delta, frame) {
    const now = Date.now()
    if (now - lastUpdate < 50) {
      return
    }
    for (const tentacle of this.tentacles) {
      updateTentacle(tentacle)
    }
    lastUpdate = now
  }
}