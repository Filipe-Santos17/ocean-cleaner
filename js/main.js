import '../style.css'

import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let camera, scene, renderer, controls, water, sun, level, started = false;

const loader = new GLTFLoader();

//Settings
const setts = (numTrash, time, sclTrash) => {
  return {
    numberOfTrash: numTrash,
    //timeLevel: time,
    //scaleTrash: sclTrash
  }
}

const levels = {
  1: setts(100), //easy
  2: setts(250), //medium
  3: setts(500), //hard
}

//Boat
class Boat {
  constructor() {
    loader.load("assets/boat/scene.gltf", (gltf) => {
      scene.add(gltf.scene)

      gltf.scene.scale.set(3, 3, 3)
      gltf.scene.position.set(5, 13, 50)
      gltf.scene.rotation.y = 1.5

      this.boat = gltf.scene

      this.speed = {
        vel: 0,
        rot: 0
      }
    })
  }

  stop() {
    this.speed.vel = 0
    this.speed.rot = 0
  }

  update() {
    if (this.boat) {
      this.boat.rotation.y += this.speed.rot
      this.boat.translateX(this.speed.vel)
    }
  }
}

const boat = new Boat

//Trash
class Trash {
  constructor(_scene) {
    scene.add(_scene)
    _scene.scale.set(1.5, 1.5, 1.5)

    if(level === 1){
      _scene.position.set(random(-100, 100), -.5, random(-100, 100))

    } else if(level === 2){
      
      if (Math.random() > .8) {
        _scene.position.set(random(-100, 100), -.5, random(-100, 100))
      } else {
        _scene.position.set(random(-300, 300), -.5, random(-800, 800))
      }

    } else {
      if (Math.random() > .6) {
        _scene.position.set(random(-100, 100), -.5, random(-100, 100))
      } else {
        _scene.position.set(random(-500, 500), -.5, random(-1000, 1000))
      }
    }

    this.trash = _scene
  }
}

//
async function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      resolve(gltf.scene)
    })
  })
}

let boatModel = null

async function createTrash() {
  if (!boatModel) {
    boatModel = await loadModel("assets/trash/scene.gltf")
  }
  return new Trash(boatModel.clone())
}

let trashes = []

async function init() {
  renderer = new THREE.WebGLRenderer();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(30, 30, 100);

  sun = new THREE.Vector3();

  // Water
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;

  scene.add(water);

  // Skybox
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSun() {

    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;

  }

  updateSun();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  water.material.uniforms;//waterUniforms

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function isColliding(obj1, obj2) {
  return (
    Math.abs(obj1.position.x - obj2.position.x) < 15 &&
    Math.abs(obj1.position.z - obj2.position.z) < 15
  )
}

function checkCollisions() {
  if (!boat.boat || !started) return;

  trashes = trashes.filter(trash => {
    if (!trash.trash) return false; // Skip if already removed

    if (isColliding(boat.boat, trash.trash)) {
      scene.remove(trash.trash);
      return false; // Remove from array
    }
    return true; // Keep in array
  });

  if (trashes.length === 0) {
    document.body.innerHTML = /*html*/`
      <div id="page" style="background-color:#3F8857;">
        <h2 style="font-size: 4rem">Parabéns, você ganhou!!!</h2>      
      </div>
    `;
  }
}

function activateBoatMove(){
  window.addEventListener( 'keydown', function(e){
    if(e.key == "ArrowUp"){
      boat.speed.vel = 1
    }
    if(e.key == "ArrowDown"){
      boat.speed.vel = -1
    }
    if(e.key == "ArrowRight"){
      boat.speed.rot = -0.1
    }
    if(e.key == "ArrowLeft"){
      boat.speed.rot = 0.1
    }
  })

  window.addEventListener( 'keyup', function(e){
    boat.stop()
  })
}

function animate() {
  requestAnimationFrame(animate);

  render();

  boat.update()

  checkCollisions()
}

function render() {
  water.material.uniforms['time'].value += 1.0 / 60.0;

  renderer.render(scene, camera);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

async function putTrash(val) {
  const { numberOfTrash } = levels[val]

  for (let i = 0; i < numberOfTrash; i++) {
    const trash = await createTrash()

    trashes.push(trash)
  }
}

function loseGame(){
  document.body.innerHTML = `
    <div id="page">
      <h2>Você perdeu</h2>      
    </div>
  `
}

function countTime() {
  const countDisplay = document.querySelector("#count p");
  let minutes = 5;
  let seconds = 0;

  const interval = setInterval(() => {
    // Format time as MM:SS with leading zeros
    const formattedTime = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    countDisplay.textContent = formattedTime;

    // Decrement time
    if (seconds === 0) {
      if (minutes === 0) {
        clearInterval(interval); 

        loseGame()
      }
      minutes--;
      seconds = 59;
    } else {
      seconds--;
    }
  }, 1000); // Update every second
}

function startGame() {
  const page = document.querySelector("#page")

  page.querySelectorAll("button").forEach(btn => btn.addEventListener("click", e => {
    const value = e.currentTarget.value

    level = +value

    putTrash(value)

    activateBoatMove()

    countTime()

    page.remove()

    setTimeout(() => started = true, 1000)
  }))

  init();
  animate();
}

startGame()