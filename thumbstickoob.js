import * as THREE from './js/three.module.js';
import { BoxLineGeometry } from './jsm/BoxLineGeometry.js';
import { VRButton } from './jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from './jsm/webxr/XRControllerModelFactory.js';

let container
let camera, scene, renderer

let room;
let bulbLight
let player

let controller1, controller2
let controllerGrip1, controllerGrip2

init()
animate()

function addController(scene, controller) {

  controller.addEventListener('connected', event => {
    controller.add(buildController( event.data))
  })

  controller.addEventListener('disconnected', event => {
    controller.remove(controller.children[0])
  })

  scene.add(controller)
}

function init() {

  container = document.createElement('div')
  document.body.appendChild(container)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x505050)

  player = new THREE.Object3D()
  scene.add(player)

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 25 );
  camera.position.set( 0, 1.6, -7 )
  player.add(camera)

  room = new THREE.LineSegments(
    new BoxLineGeometry( 6, 6, 20, 10, 10, 10 ).translate( 0, 3, 0 ),
    new THREE.LineBasicMaterial( { color: 0x808080 } )
  )
  scene.add(room)

  scene.add(new THREE.HemisphereLight(0x606060, 0x404040))

  var light = new THREE.DirectionalLight(0xffffff)
  light.position.set( 1, 1, 1 ).normalize()
  scene.add(light)

  bulbLight = new THREE.PointLight(0xffee88, 1, 100, 2)
  bulbLight.position.set(0, 2, 0)
  bulbLight.castShadow = true
  scene.add(bulbLight)

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  container.appendChild( renderer.domElement );
  
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
  
  scene.add(controllerGrip1)
  scene.add(controllerGrip2)

  window.addEventListener('resize', onWindowResize, false)
  document.body.appendChild(VRButton.createButton(renderer))

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
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize( window.innerWidth, window.innerHeight )
}

function handleController(time, controller) {
  const motionController = controller.userData.controllerModel.motionController
  if (motionController) {
    const hand = motionController.xrInputSource.handedness
    const thumbStick = motionController.components["xr-standard-thumbstick"]
    const values = thumbStick.values
    if (hand == "left") {
      const xrCamera = renderer.xr.getCamera(camera)
      const cameraDirection = xrCamera.getWorldDirection()
      const strafeDirection = new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x)
      player.position.add(cameraDirection.multiplyScalar(-values.yAxis / 10))
      player.position.add(strafeDirection.multiplyScalar(values.xAxis / 10))
    } else if (hand == "right") {
      player.rotation.y += - values.xAxis / 10
    }
  }
}

function animate() {
  renderer.setAnimationLoop(render)
}

function render(time, frame) {
  handleController(time, controller1)
  handleController(time, controller2)

  renderer.render(scene, camera)
}



