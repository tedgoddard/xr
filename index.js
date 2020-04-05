import * as THREE from './js/three.module.js';
import { BoxLineGeometry } from './jsm/BoxLineGeometry.js';
import { VRButton } from './jsm/VRButton.js';
import { XRControllerModelFactory } from './jsm/webxr/XRControllerModelFactory.js';

var clock = new THREE.Clock();

var container;
var camera, scene, raycaster, renderer;

var room;
var knife;
const knifeColor = 0x307010
//			var controller, tempMatrix = new THREE.Matrix4();
var tempMatrix = new THREE.Matrix4();
var controller1, controller2;
var controllerGrip1, controllerGrip2;
let log = ""
var INTERSECTED;

init();
animate();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x505050 );

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
  camera.position.set( 0, 1.6, 3 );
  scene.add( camera );

  room = new THREE.LineSegments(
    new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
    new THREE.LineBasicMaterial( { color: 0x808080 } )
  );
  scene.add( room );

  scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

  var light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 1, 1, 1 ).normalize();
  scene.add( light );

  var geometry = new THREE.BoxBufferGeometry( 0.15, 0.15, 0.15 );

  /*
  for ( var i = 0; i < 200; i ++ ) {
    var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
    object.position.x = Math.random() * 4 - 2;
    object.position.y = Math.random() * 4;
    object.position.z = Math.random() * 4 - 2;
    object.rotation.x = Math.random() * 2 * Math.PI;
    object.rotation.y = Math.random() * 2 * Math.PI;
    object.rotation.z = Math.random() * 2 * Math.PI;
    object.scale.x = Math.random() + 0.5;
    object.scale.y = Math.random() + 0.5;
    object.scale.z = Math.random() + 0.5;
    object.userData.velocity = new THREE.Vector3();
    object.userData.velocity.x = Math.random() * 0.01 - 0.005;
    object.userData.velocity.y = Math.random() * 0.01 - 0.005;
    object.userData.velocity.z = Math.random() * 0.01 - 0.005;
    room.add( object );
  }
*/
  const knifeGeometry = new THREE.BoxBufferGeometry( 0.15, 0.05, 0.8 );
  knife = new THREE.Mesh( knifeGeometry, new THREE.MeshLambertMaterial( { color: knifeColor } ) );
  knife.position.x = 0;
  knife.position.y = 1;
  knife.position.z = 1;
  room.add( knife );

  
  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.xr.enabled = true;
  container.appendChild( renderer.domElement );

  //

  function onSelectStart() {

    this.userData.isSelecting = true;

  }

  function onSelectEnd() {

    this.userData.isSelecting = false;

  }

//				controller = renderer.xr.getController( 0 );
//				controller.addEventListener( 'selectstart', onSelectStart );
//				controller.addEventListener( 'selectend', onSelectEnd );
//				controller.addEventListener( 'connected', function ( event ) {
//
//					this.add( buildController( event.data ) );

//				} );
//				controller.addEventListener( 'disconnected', function () {
//
//					this.remove( this.children[ 0 ] );
//
//				} );
//				scene.add( controller );

  
  
  //controller models
  controller1 = renderer.xr.getController( 0 );
  controller1.addEventListener( 'selectstart', onSelectStart );
  controller1.addEventListener( 'selectend', onSelectEnd );
  controller1.addEventListener( 'connected', function ( event ) {
    this.add( buildController( event.data ) );
  } );
  controller1.addEventListener( 'disconnected', function () {
    this.remove( this.children[ 0 ] );
  } );
  scene.add( controller1 );
  controller1.addEventListener( 'squeeze', function ( event ) {
    this.userData.squeezeEvent = event
    log = (new Date()).toLocaleTimeString() + "<br>"
    log += JSON.stringify(event)
    logFlash((new Date()).toLocaleTimeString())
  } );

  
  controller2 = renderer.xr.getController( 1 );
  controller2.addEventListener( 'selectstart', onSelectStart );
  controller2.addEventListener( 'selectend', onSelectEnd );
  controller2.addEventListener( 'connected', function ( event ) {
    this.add( buildController( event.data ) );
  } );
  controller2.addEventListener( 'disconnected', function () {
    this.remove( this.children[ 0 ] );
  } );
  controller2.addEventListener( 'squeeze', function ( event ) {
    this.userData.squeezeEvent = event
  } );

  scene.add( controller2 );

  // The XRControllerModelFactory will automatically fetch controller models
  // that match what the user is holding as closely as possible. The models
  // should be attached to the object returned from getControllerGrip in
  // order to match the orientation of the held device.

  var controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip( 0 );
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  scene.add( controllerGrip1 );

  controllerGrip2 = renderer.xr.getControllerGrip( 1 );
  controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
  scene.add( controllerGrip2 );

  //end controller models
  const labelPosition = { x: 0, y: 1.2, z: 1 }
  const logLabel = makeLabel(20, labelPosition, "The Logs")
  scene.add(logLabel)

  window.addEventListener( 'resize', onWindowResize, false );

  //

  document.body.appendChild( VRButton.createButton( renderer ) );

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


function handleController( controller ) {
  if ( controller.userData.squeezeEvent ) {
      knife.material.color.setHex( 0x000000 );
     knife.position.copy( controller.position );
    controller.userData.squeezeEvent = null
  }
  if ( controller.userData.isSelecting ) {
    knife.material.color.setHex( 0x550000 );
     knife.position.copy( controller.position );

/*
    knife.position.copy( controller.position );
    knife.userData.velocity.x = ( Math.random() - 0.5 ) * 3;
    knife.userData.velocity.y = ( Math.random() - 0.5 ) * 3;
    knife.userData.velocity.z = ( Math.random() - 9 );
    knife.userData.velocity.applyQuaternion( controller.quaternion );
*/
  } else {
    knife.material.color.setHex(knifeColor);
  }

}


function animate() {

  renderer.setAnimationLoop( render );

}

function render() {
  document.getElementById("log").innerHTML = log
  handleController( controller1 );
  handleController( controller2 );

  var delta = clock.getDelta() * 60;

//				if ( controller.userData.isSelecting === true ) {
//
//					var cube = room.children[ 0 ];
//					room.remove( cube );

//					cube.position.copy( controller.position );
//					cube.userData.velocity.x = ( Math.random() - 0.5 ) * 0.02 * delta;
//					cube.userData.velocity.y = ( Math.random() - 0.5 ) * 0.02 * delta;
//					cube.userData.velocity.z = ( Math.random() * 0.01 - 0.05 ) * delta;
//					cube.userData.velocity.applyQuaternion( controller.quaternion );
//					room.add( cube );
//
//				}

  // find intersections

//				tempMatrix.identity().extractRotation( controller.matrixWorld );

//				raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
//				raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );

//				var intersects = raycaster.intersectObjects( room.children );
//
//				if ( intersects.length > 0 ) {
//
//					if ( INTERSECTED != intersects[ 0 ].object ) {
//
//						if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
//
//						INTERSECTED = intersects[ 0 ].object;
//						INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
//						INTERSECTED.material.emissive.setHex( 0xff0000 );
//
//					}
//
//				} else {
//
//					if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
//
//					INTERSECTED = undefined;
//
//				}

  // Keep cubes inside room
/*
  for ( var i = 0; i < room.children.length; i ++ ) {
    var cube = room.children[ i ];
    cube.userData.velocity.multiplyScalar( 1 - ( 0.001 * delta ) );
    cube.position.add( cube.userData.velocity );
    if ( cube.position.x < - 3 || cube.position.x > 3 ) {
      cube.position.x = THREE.Math.clamp( cube.position.x, - 3, 3 );
      cube.userData.velocity.x = - cube.userData.velocity.x;
    }
    if ( cube.position.y < 0 || cube.position.y > 6 ) {
      cube.position.y = THREE.Math.clamp( cube.position.y, 0, 6 );
      cube.userData.velocity.y = - cube.userData.velocity.y;
    }
    if ( cube.position.z < - 3 || cube.position.z > 3 ) {
      cube.position.z = THREE.Math.clamp( cube.position.z, - 3, 3 );
      cube.userData.velocity.z = - cube.userData.velocity.z;
    }
    cube.rotation.x += cube.userData.velocity.x * 2 * delta;
    cube.rotation.y += cube.userData.velocity.y * 2 * delta;
    cube.rotation.z += cube.userData.velocity.z * 2 * delta;
  }
*/
  renderer.render( scene, camera );

}

function makeLabelCanvas(size, text) {
  const borderSize = 2;
  const ctx = document.createElement('canvas').getContext('2d');
  const font =  `${size}px bold sans-serif`;
  ctx.font = font;
  // measure how long the name will be
  const doubleBorderSize = borderSize * 2;
  const width = ctx.measureText(text).width + doubleBorderSize;
  const height = size + doubleBorderSize;
  ctx.canvas.width = width;
  ctx.canvas.height = height;

  // need to set font again after resizing canvas
  ctx.font = font;
  ctx.textBaseline = 'top';

  ctx.fillStyle = 'blue';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.fillText(text, borderSize, borderSize);

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

  // if units are meters then 0.01 here makes size
  // of the label into centimeters.
  const labelBaseScale = 0.001;
  label.scale.x = canvas.width  * labelBaseScale;
  label.scale.y = canvas.height * labelBaseScale;
  return label
}

function logFlash(text) {
  const labelName = "log_flash"
  const labelPosition = { x: 0, y: 1.5, z: 1 }
  const logLabel = makeLabel(20, labelPosition, text)
  logLabel.name = labelName
  scene.add(logLabel)
  setTimeout(() => { scene.removeObjectByName(labelName)}, 2000)
}
