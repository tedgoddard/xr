import * as THREE from './js/three.module.js';
import { BoxLineGeometry } from './jsm/BoxLineGeometry.js';
import { VRButton } from './jsm/VRButton.js';
import { XRControllerModelFactory } from './jsm/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js'
import { OBJLoader } from './jsm/loaders/OBJLoader.js'
import { MTLLoader } from './jsm/loaders/MTLLoader.js'

var clock = new THREE.Clock();
const loader = new GLTFLoader()
const audioListener = new THREE.AudioListener()
const audioLoader = new THREE.AudioLoader()
const thump = new THREE.PositionalAudio(audioListener)
const scuff = new THREE.PositionalAudio(audioListener)
const textureLoader = new THREE.TextureLoader()

const zeroVector = new THREE.Vector3()
const halfPi = Math.PI / 2

var container;
var camera, scene, raycaster, renderer;

let room
let knife
let knifeTemplate
let hall
let bulbLight
let gripBox = null
let gripMarker = null
let player = null
let targetMesh = null
let helvetiker = null
let showControllerRays = true

// const knifeColor = 0x303030
const knifeColor = 0x303030
const knifeBladeColor = 0xFF0000
const knifeHandleColor = 0xFF0000
//			var controller, tempMatrix = new THREE.Matrix4();
var tempMatrix = new THREE.Matrix4();
var controller1, controller2;
var controllerGrip1, controllerGrip2;
// let lastRender = "_"
const gravity = new THREE.Vector3(0, -0.00009, 0)
// const gravity = new THREE.Vector3(0, 0, 0)

init()
animate()

let crazyGlobalCallback = null
let renderPointerCallback = null
let intersectList = []

function addController(scene, controller) {

  function onSelectStart() {
    controller.userData.isSelecting = true
    if (crazyGlobalCallback) {
      crazyGlobalCallback()
    }
  }

  function onSelectEnd() {
    if (controller.userData.isSelecting) {
      controller.userData.selectEnded = true
    }
    controller.userData.isSelecting = false;
  }

  controller.addEventListener('selectstart', onSelectStart)
  controller.addEventListener('selectend', onSelectEnd)
  controller.addEventListener('connected', event => {
    controller.add(buildController( event.data))
  })
  controller.addEventListener('disconnected', event => {
    controller.remove(controller.children[0])
  })
  controller.addEventListener('squeeze', event => {
    controller.userData.squeezeEvent = event
  })
  // scene.add(controller)
  player.add(controller)
}

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x505050 );

  player = new THREE.Object3D()
  scene.add(player)

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 25 );
  camera.position.set( 0, 1.6, 3 );
  camera.add(audioListener)
  // scene.add( camera );
  player.add(camera)

  audioLoader.load( 'sounds/thump.ogg', buffer => {
    thump.setBuffer(buffer)
    thump.setRefDistance(20)
  })
  audioLoader.load( 'sounds/scuff.ogg', buffer => {
    scuff.setBuffer(buffer)
    scuff.setRefDistance(20)
  })

  room = new THREE.LineSegments(
    new BoxLineGeometry( 6, 6, 20, 10, 10, 10 ).translate( 0, 3, 0 ),
    new THREE.LineBasicMaterial( { color: 0x808080 } )
  );
  scene.add( room );

  scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

  var light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 1, 1, 1 ).normalize();
  scene.add( light );

  bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );
  bulbLight.position.set( 0, 2, 0 );
  // bulbLight.castShadow = true;
  scene.add( bulbLight );

  var geometry = new THREE.BoxBufferGeometry( 0.15, 0.15, 0.15 );

  // loader.load("knife.glb", (gltf) => {
  //   knife = new THREE.Object3D()
  //   const knifeScene = gltf.scene
  //   knifeScene.scale.set(0.01, 0.01, 0.01)
  //   knifeScene.position.x = -0.1
  //   knifeTemplate = knifeScene.clone()
  //   // knifeScene.position.y = 1;
  //   knifeScene.position.z = 0;
  //   knifeScene.rotation.y = -halfPi
  //   knifeScene.children[2].material = new THREE.MeshStandardMaterial( { color: knifeColor, metalness: 0.8, roughness: 0.7 } )
  //   knifeScene.children[3].material = new THREE.MeshStandardMaterial( { color: knifeColor, metalness: 1.0, roughness: 0.2 } )
  //   knife.add(knifeScene)
  //   player.add(knife)
  //   knife.add(thump)
  //   knife.add(scuff)
  //   knife.userData.velocity = new THREE.Vector3(0, .0003, -0.0003)
  //   knife.userData.eulerVelocity = new THREE.Vector3(0, .0003, -0.0003)
  // })

  // loader.load("wall2.glb", (gltf) => {
  //   const room = gltf.scene
  //   room.position.z = -8
  //   scene.add(room)
  // })

  // const path = "walls/"
  // new MTLLoader().setPath(path).load("stack.mtl", materials => {
  //   materials.preload()
  //   const objLoader = new OBJLoader().setMaterials(materials).setPath(path)
  //   objLoader.load("stack.obj", object => {
  //     const room = object
  //     room.position.z = -8
  //     const room1 = room.clone()
  //     room1.position.y = 3.8
  //     scene.add(room)
  //     scene.add(room1)
  //   })
  // })

  raycaster = new THREE.Raycaster()

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  container.appendChild( renderer.domElement );
  
  //controller models
  controller1 = renderer.xr.getController(0)
  controller2 = renderer.xr.getController(1)

  controller1.userData.name = "controller1"
  controller2.userData.name = "controller2"

  addController(scene, controller1)
  addController(scene, controller2)

  const controllerModelFactory = new XRControllerModelFactory()

  controllerGrip1 = renderer.xr.getControllerGrip(0)
  controllerGrip2 = renderer.xr.getControllerGrip(1)

  const controllerModel1 = controllerModelFactory.createControllerModel(controllerGrip1)
  const controllerModel2 = controllerModelFactory.createControllerModel(controllerGrip2)
  controller1.userData.controllerModel = controllerModel1
  controller2.userData.controllerModel = controllerModel2

  controllerGrip1.add(controllerModel1)
  controllerGrip2.add(controllerModel2)

  player.add(controllerGrip1)
  player.add(controllerGrip2)

  //end controller models

  gripBox = new THREE.Object3D()
  // const markerGeometry = new THREE.BoxGeometry( 0.01, 0.01, 0.1 )
  // var markerMaterial = new THREE.MeshBasicMaterial( {color: 0x00ff00, emissive: 1.0 } )
  // gripMarker = new THREE.Mesh( markerGeometry, markerMaterial )
  gripMarker = new THREE.Object3D()
  gripMarker.position.z = -0.5
  gripBox.add(gripMarker)
  scene.add(gripBox)

  window.addEventListener( 'resize', onWindowResize, false );

  const buttonOptions = {
    onclick: () => {
      console.log("click")
      thump.context.resume()
      scuff.context.resume()
    }
  }
  document.body.appendChild( VRButton.createButton( renderer, buttonOptions ) );

}

function buildController( data ) {

  switch ( data.targetRayMode ) {

    case 'tracked-pointer':

      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
      geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

      var material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

      return new THREE.Line( geometry, material );

    case 'gaze':

      var geometry = new THREE.RingBufferGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
      var material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
      return new THREE.Mesh( geometry, material );

  }

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

function calculateVelocity(positions) {
  let velocity = new THREE.Vector3()
  if (positions.length == 0) {
    return velocity
  }
  for (let i = 1; i < positions.length; i++) {
    const previous = positions[i - 1]
    const { time, position } = positions[i]
    const deltaT = time - previous.time
    const deltaX = position.clone().sub(previous.position)
    velocity.add(deltaX.divideScalar(deltaT))
  }
  velocity.divideScalar(positions.length)
  return velocity
}

function handleController(time, controller) {
  const controllerModel = controller.userData.controllerModel
  if (controller.children.length > 0) {
    controller.children[0].visible = showControllerRays
  }
  const motionController = controllerModel.motionController
  if (motionController) {
    const hand = motionController.xrInputSource.handedness
    const thumbStick = motionController.components["xr-standard-thumbstick"]
    const values = thumbStick.values
    if (hand == "left") {
      const xrCamera = renderer.xr.getCamera(camera)
      const cameraDirection = xrCamera.getWorldDirection()
      const strafeDirection = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x)
      cameraDirection.y = 0
      player.position.add(cameraDirection.multiplyScalar(-values.yAxis / 10))
      player.position.add(strafeDirection.multiplyScalar(values.xAxis / 10))
    } else if (hand == "right") {
      player.rotation.y += - values.xAxis / 10
    }
  }
  // const { x, y, z } = controller.position
  // const position = new THREE.Vector3(x, y, z)
  // const position = controller.position.clone()
  const position = gripMarker.localToWorld(new THREE.Vector3(0,0,-0.1))
  /* knife velocity */
  const positions = controller.userData.positions || []
  positions.push({ time, position })
  if (positions.length > 10) {
    positions.shift()
  }
  controller.userData.positions = positions

  const rotation = controller.rotation.clone().toVector3()
  const quaternion = controller.quaternion.clone()
  const rotations = controller.userData.rotations || []
  const quaternions = controller.userData.quaternions || []
  rotations.push({ time, position: rotation })
  if (rotations.length > 10) {
    rotations.shift()
  }
  controller.userData.rotations = rotations

  quaternions.push({ time, quaternion })
  if (quaternions.length > 10) {
    quaternions.shift()
  }
  controller.userData.quaternions = quaternions

  controller.userData.velocity = calculateVelocity(positions)
  controller.userData.eulerVelocity = calculateVelocity(rotations )

  if ( controller.userData.squeezeEvent ) {
    if (knife.material) {
      knife.material.color.setHex( 0x000000 );
    }
    knife.position.copy( controller.position );
    controller.userData.squeezeEvent = null
    // logFlash("squeezing:\n" + JSON.stringify(renderer.xr.getSession()))
    // knife.userData.velocity.multiplyScalar( 1 - ( 0.001 * delta ) );
    // knife.position.add( knife.userData.velocity );

  }
  if ( controller.userData.isSelecting ) {
    knife.visible = true
    // if (knife.material) {
    //   knife.material.color.setHex( 0x550000 );
    // }
    knife.position.copy(controller.position)
    knife.rotation.copy(controller.rotation)

    gripBox.position.copy(controller.position)
    gripBox.rotation.copy(controller.rotation)

  } else {
    if (knife && knife.material) {
      knife.material.color.setHex(knifeColor);
    }
  }
  if ( controller.userData.selectEnded ) {
    if (knife) {
      knife.userData.velocity = controller.userData.velocity
      knife.userData.eulerVelocity = controller.userData.eulerVelocity
    }
    controller.userData.selectEnded = false
  }
}


function animate() {

  renderer.setAnimationLoop( render );

}

function stickKnife(knifeWorld) {
  const wallDepth = -8.76
  if (knifeWorld.z > wallDepth) {
    return
  }
  if (knifeWorld.distanceTo(targetMesh.position) > 1) {
    //TODO: drop knife if target missed
    // knife.userData.velocity = zeroVector.clone()
    // const playerKnife = player.worldToLocal(knifeWorld)
    // knife.position.set(playerKnife.x, playerKnife.y, wallDepth)
    return
  }
  knife.userData.velocity = null
  knife.userData.eulerVelocity = null
  knife.visible = false
  const stuckKnife = knifeTemplate.clone()
  stuckKnife.position
    .set(knifeWorld.x - 0.1, knifeWorld.y, wallDepth)
  stuckKnife.rotation
    .set(knife.rotation.x, knife.rotation.y - halfPi, knife.rotation.z)
  scene.add(stuckKnife)
  if (thump.context.state == "running") {
    thump.play()
  }
}

function render(time, frame) {

  handleController(time, controller1)
  handleController(time, controller2)
  if (renderPointerCallback) {
    const hits = intersects(intersectList)
    renderPointerCallback(hits)
  }
  // gripBox.position.copy(controller2.position)
  // gripBox.rotation.copy(controller2.rotation)

  var delta = clock.getDelta() * 60 * 10;
  let knifeVelocity = null
  let eulerVelocity = null
  if (knife) {
    knifeVelocity = knife.userData.velocity
    // eulerVelocity = knife.userData.eulerVelocity
  }

  if (knifeVelocity) {
    knifeVelocity.add(gravity)
    knifeVelocity = knifeVelocity.clone()
    knifeVelocity.multiplyScalar(delta * 4)
    knife.position.add(knifeVelocity)
    const knifeWorld = knife.localToWorld(new THREE.Vector3())

    if (knifeWorld.y < -0.5) {
      knife.userData.velocity = null
      if (scuff.context.state == "running") {
        scuff.play()
      }
    }
    stickKnife(knifeWorld)
  }

  renderer.render( scene, camera );

}

function makeLabelCanvas(size, text) {
  const lines = text.split("\n")
  const borderSize = 2;
  const ctx = document.createElement('canvas').getContext('2d');
  const font =  `${size}px bold sans-serif`;
  ctx.font = font;
  const doubleBorderSize = borderSize * 2;
  let width = 0
  for (const line of lines) {
    const lineWidth = ctx.measureText(text).width + doubleBorderSize
    width = Math.max(width, lineWidth)
  }
  width = Math.min(width, 400)
  const height = (size + doubleBorderSize) * lines.length
  ctx.canvas.width = width;
  ctx.canvas.height = height;

  // need to set font again after resizing canvas
  ctx.font = font;
  ctx.textBaseline = 'top';

  ctx.fillStyle = 'rosybrown';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const y = i * (size + borderSize)
    ctx.fillText(line, borderSize, borderSize + y);
  }

  return ctx.canvas;
}

function makeLabel(size, position, text) {
  const canvas = makeLabelCanvas(size, text);
  const texture = new THREE.CanvasTexture(canvas);
  // because our canvas is likely not a power of 2
  // in both dimensions set the filtering appropriately.
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const labelMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const labelGeometry = new THREE.PlaneBufferGeometry(1, 1);
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.x = position.x;
  label.position.y = position.y;
  label.position.z = position.z;

  const labelBaseScale = 0.001;
  label.scale.x = canvas.width  * labelBaseScale;
  label.scale.y = canvas.height * labelBaseScale;
  return label
}

const getMethods = (obj) => {
  let properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}

export function logFlash(text, time = 1) {
  let cameraDirection = camera.getWorldDirection()
  // const cameraPosition = camera.position.clone()
  // const labelPosition = cameraPosition.add(cameraDirection)
  let labelPosition = { x: 0, y: 1, z: 4 }
  const session = renderer.xr.getSession()
  if (session) {
    const xrCamera = renderer.xr.getCamera(camera)
    const cameraDirection = xrCamera.getWorldDirection()
    cameraDirection.z = -4
    // const { x, y, z } = cameraDirection
    // cameraDirection.multiplyScalar(-1)
    const cameraPosition = camera.position.clone()
    labelPosition = cameraPosition.add(cameraDirection)
  }
  const logLabel = makeLabel(20, labelPosition, text)
  scene.add(logLabel )
  setTimeout(() => { scene.remove(logLabel) }, time * 1000)
}

async function loadFont(fontName, fontWeight = "regular") {
  var loader = new THREE.FontLoader()
  const fileName = `fonts/${fontName}_${fontWeight}.typeface.json`
  return new Promise( (resolve, reject) => {
    loader.load(fileName, font => {
      resolve(font)
    })
  })
}

async function ensureHelvetiker() {
  if (!helvetiker) {
    helvetiker = await loadFont("helvetiker")
  }
}

function raycastIntersect(controller, objects) {
  const tempMatrix = new THREE.Matrix4()
  tempMatrix.identity().extractRotation(controller.matrixWorld)
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
  raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4(tempMatrix)
  return raycaster.intersectObjects(objects)
}

function intersects(objects) {
  const controller1Intersects = raycastIntersect(controller1, objects)
  const controller2Intersects = raycastIntersect(controller2, objects)
  return [controller1Intersects, controller2Intersects]
}

function boundingToBox(object) {
  const bounding = object.geometry.boundingBox

  const length = bounding.max.x - bounding.min.x
  const width = bounding.max.y - bounding.min.y
  const height = bounding.max.z - bounding.min.z

  const boxGeometry = new THREE.BoxGeometry(length, width, height)
  const material = new THREE.MeshBasicMaterial(
    {color: 0x0000ff, visible: false, transparent: true, opacity: 0.5}
  )
  const box = new THREE.Mesh(boxGeometry, material)
  
  box.position.x = object.position.x + length / 2
  box.position.y = object.position.y
  box.position.z = object.position.z + height / 2

  box.rotation.x = object.rotation.x
  box.rotation.y = object.rotation.y
  box.rotation.z = object.rotation.z
  box.userData.object = object
  //TODO: fix bounding box position
  scene.add(box)
  return box
}

export class VRRoom {
  constructor() {
    this.scene = scene
    this.halfPi = halfPi
    this.raycaster = raycaster
    this.intersects = intersects
  }

  async loadTexturePanel(image) {
    const texture = await textureLoader.load(image)
      texture.format = THREE.RGBAFormat
      const material = new THREE.MeshLambertMaterial({
        map: texture
      })
      const geometry = new THREE.PlaneGeometry(10, 10)
      return new THREE.Mesh(geometry, material)
  }

  async loadText(text, options) {
    const defaults = { 
      size: 0.5,
      height: 0.1,
      curveSegments: 8,
      bevelThickness: 0.1,
      bevelSize: 0.01,
      bevelEnabled: true
    }
    options = { ...defaults, ...options }
    if (!options.font) {
      await ensureHelvetiker()
      options.font = helvetiker
    }
    let textGeo = new THREE.TextGeometry(text, options)
    textGeo.computeBoundingBox()
    var centerOffset = - 0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x)

    textGeo = new THREE.BufferGeometry().fromGeometry(textGeo)
    const materials = options.materials || [
      new THREE.MeshPhongMaterial( { color: 0x888888, flatShading: false } ), // front
      new THREE.MeshPhongMaterial( { color: 0x888888, flatShading: false } ) // side
    ]

    const mesh = new THREE.Mesh(textGeo, materials)

    mesh.position.x = centerOffset / 2
    mesh.rotation.y = Math.PI * 2
    return mesh
  }

  addSelectListener(listener) {
    crazyGlobalCallback = listener
  }

  addPointerListener(list, listener) {
    renderPointerCallback = listener
    intersectList = list.map( item => boundingToBox(item) )
  }

}