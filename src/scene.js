import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("canvas");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.01,
  8000
);
camera.position.set(0, 40, 100);

export const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const sunLight = new THREE.PointLight(0xfffde0, 400, 0, 2.3);
scene.add(sunLight);
const sunFill = new THREE.PointLight(0xfffde0, 0.4, 0, 0);
scene.add(sunFill);

const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,
  0.4,
  0.85
);
export const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);
export { bloomPass };

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// skipControlsUpdate est activé par camera.js en mode following
// pour éviter que controls.update() écrase camera.position / lookAt
export let skipControlsUpdate = false;
export function setSkipControlsUpdate(v) {
  skipControlsUpdate = v;
}

export function startLoop(onFrame) {
  renderer.setAnimationLoop(() => {
    if (!skipControlsUpdate) {
      controls.update();
    }

    onFrame();
    composer.render();
  });
}
