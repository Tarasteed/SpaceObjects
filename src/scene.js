import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

// #region ── Renderer ─────────────────────────────────────────────────────────

const canvas = document.getElementById("canvas");
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// CSS2DRenderer — overlay HTML pour les étiquettes des planètes.
// Positionné par-dessus le canvas via position:absolute, pointer-events:none
// pour ne pas intercepter les clics sur la scène.
export const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.id = "label-renderer";
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

// #endregion

// #region ── Scène, caméra et contrôles ───────────────────────────────────────

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1, // ← était 0.01 — monte le near
  2000000 // ← était 8000 — monte le far pour voir la galaxie
);
camera.position.set(0, 40, 100);

export const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// #endregion

// #region ── Lumières ─────────────────────────────────────────────────────────

const sunLight = new THREE.PointLight(0xfffde0, 400, 0, 2.3);
scene.add(sunLight);

// Lumière de remplissage — adoucit les ombres sans directionnel visible
const sunFill = new THREE.PointLight(0xfffde0, 0.4, 0, 0);
scene.add(sunFill);

// #endregion

// #region ── Post-processing (bloom) ──────────────────────────────────────────

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

// #endregion

// #region ── Resize ───────────────────────────────────────────────────────────

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// #endregion

// #region ── Boucle de rendu ───────────────────────────────────────────────────

// skipControlsUpdate est activé par camera.js en mode FOLLOWING
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
    labelRenderer.render(scene, camera);
  });
}

// #endregion
