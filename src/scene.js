import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// Renderer
const canvas = document.getElementById("canvas");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // ← rendu cinématique
renderer.toneMappingExposure = 1.0;

// Scène & caméra
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.01,
  8000
);
camera.position.set(0, 12, 30);

// Contrôles orbite (rotation libre à la souris)
export const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lumières
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const sunLight = new THREE.PointLight(0xfffde0, 200, 0, 1.9);
scene.add(sunLight);

// ── Post-processing : Bloom ───────────────────────
const renderPass = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,   // strength
  0.5,   // radius
  0.98   // threshold très haut — seul le Soleil surexposé passe
);

export const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(bloomPass);

export { bloomPass };

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Boucle d'animation
export function startLoop(onFrame) {
  renderer.setAnimationLoop(() => {
    controls.update();
    onFrame();
    // renderer.render(scene, camera);
    composer.render();
  });
}
