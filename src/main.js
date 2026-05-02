import { scene, startLoop, camera } from "./scene.js";
import { createPlanet, createSaturnRings, createLensFlare } from "./objects.js";
import {
  buildSidebar,
  showTooltip,
  hideTooltip,
  buildBackButton,
  showBackButton,
  buildSimControls,
} from "./ui.js";
import { updateCamera, zoomTo, zoomToSystem } from "./camera.js";
import * as THREE from "three";
import { sim } from "./state.js";
import { OBJECTS } from "./data.js";

// Puis dérive les variables dont tu as besoin
const planetsData = OBJECTS.filter((o) => o.type === "planet");
const sunData = OBJECTS.find((o) => o.id === "sun");
const moonData = OBJECTS.find((o) => o.id === "moon");

// Map id → mesh (pour le zoom depuis la sidebar)
export const meshById = new Map();

// ── Skybox photographique ────────────────────────
function createSkybox() {
  const loader = new THREE.TextureLoader();
  loader.load("/textures/starmap.jpg", (texture) => {
    const geo = new THREE.SphereGeometry(4000, 256, 256); // ← 256 segments, plus de facettes
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide, // rendu depuis l'intérieur
      color: new THREE.Color(0.4, 0.4, 0.4), // ← assombrit la texture de 40%
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -1; // ← rendu en premier
    scene.add(mesh);
  });
}

// ── Étoiles générées par-dessus la skybox ────────
function createStars() {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  const starTexture = new THREE.CanvasTexture(canvas);

  const starGroups = [
    { count: 12000, color: new THREE.Color("#ffccaa"), size: 0.8, minDist: 80 },
    { count: 4800, color: new THREE.Color("#fff5e0"), size: 1.0, minDist: 80 },
    { count: 1600, color: new THREE.Color("#ffffff"), size: 1.3, minDist: 100 },
    { count: 400, color: new THREE.Color("#aabbff"), size: 2.0, minDist: 120 },
  ];

  starGroups.forEach((group) => {
    const positions = [];
    for (let i = 0; i < group.count; i++) {
      const r = group.minDist + Math.random() * 3800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const mat = new THREE.PointsMaterial({
      color: group.color,
      size: group.size,
      map: starTexture,
      alphaTest: 0.01,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.5,
      depthWrite: false,
      depthTest: true,
    });
    scene.add(new THREE.Points(geo, mat));
  });
}

createSkybox();
createStars();

// ── Soleil ───────────────────────────────────────
const sunMesh = createPlanet({
  radius: sunData.radius,
  texturePath: sunData.texturePath,
  position: [0, 0, 0],
  emissive: sunData.emissive,
});

sunMesh.userData.name = sunData.name;
sunMesh.userData.id = sunData.id;
meshById.set("sun", sunMesh);

createLensFlare(sunMesh);

// ── Création des pivots d'orbite ─────────────────
// Un "pivot" est un Object3D invisible placé au centre (0,0,0).
// La planète est son enfant, décalée sur l'axe X de orbitR.
// Faire tourner le pivot fait orbiter la planète autour du Soleil.
const pivots = planetsData.map((p) => {
  const pivot = new THREE.Object3D();
  scene.add(pivot);

  // La planète est placée à x=orbitR dans le référentiel du pivot
  const mesh = createPlanet({
    radius: p.radius,
    texturePath: p.texturePath,
    position: [p.orbitR, 0, 0],
    roughness: p.roughness ?? 0.8,
  });

  // On retire le mesh de la scène et on le met sous le pivot
  scene.remove(mesh);
  pivot.add(mesh);

  // On stocke le nom pour les infobulles plus tard
  mesh.userData.name = p.name;
  mesh.userData.id = p.id;
  meshById.set(p.id, mesh);

  // Anneaux pour Saturne
  if (p.rings) {
    createSaturnRings(mesh);
  }

  // ── Lune ──────────────────────────────────────
  // La Lune est enfant d'un pivot attaché à la Terre,
  // elle-même enfant du pivot terrestre.
  // Elle orbite donc autour de la Terre, qui orbite autour du Soleil.
  let moonPivot = null;
  let moonMesh = null;

  if (p.hasMoon) {
    moonPivot = new THREE.Object3D();
    mesh.add(moonPivot); // attaché à la Terre, pas à la scène

    moonMesh = createPlanet({
      radius: moonData.radius,
      texturePath: moonData.texturePath,
      position: [moonData.orbitR, 0, 0],
    });

    scene.remove(moonMesh);
    moonPivot.add(moonMesh);
    moonMesh.userData.name = moonData.name;
    moonMesh.userData.id = moonData.id;
    meshById.set(moonData.id, moonMesh);
  }

  return {
    pivot,
    speed: p.speed,
    rotSpeed: p.rotSpeed,
    mesh,
    moonPivot,
    moonMesh,
  };
});

// ── Boucle d'animation ────────────────────────────
// t est un compteur de temps qui grandit à chaque frame.
// On multiplie t par speed pour que chaque planète aille à sa vitesse.
let t = 0;

startLoop(() => {
  // N'avance le temps que si pas en pause
  if (!sim.paused) {
    t += 0.005 * sim.speedFactor;
  }

  pivots.forEach(({ pivot, speed, rotSpeed, mesh, moonPivot, moonMesh }) => {
    pivot.rotation.y = t * speed;
    mesh.rotation.y = t * rotSpeed;
    // La Lune tourne ~13× plus vite que la Terre autour du Soleil
    if (moonPivot) {
      moonPivot.rotation.y = t * moonData.orbitalSpeed;
    }
    if (moonMesh) {
      moonMesh.rotation.y = t * moonData.rotSpeed; // rotation synchrone
    }
  });

  sunMesh.rotation.y = t * 0.037;

  updateCamera();
});

// Lance la sidebar — le callback sera complété à l'étape infobulles
buildSidebar((obj) => {
  showTooltip(obj);
  const mesh = meshById.get(obj.id);
  if (mesh) {
    zoomTo(mesh);
    showBackButton();
  }
});

buildBackButton(() => {
  zoomToSystem();
  hideTooltip(); // cache l'infobulle au retour
});

buildSimControls();
