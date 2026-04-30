import { scene, startLoop } from "./scene.js";
import { createPlanet, createSaturnRings } from "./objects.js";
import {
  buildSidebar,
  showTooltip,
  buildBackButton,
  showBackButton,
} from "./ui.js";
import { updateCamera, zoomTo, zoomToSystem } from "./camera.js";
import * as THREE from "three";
// Map id → mesh (pour le zoom depuis la sidebar)
export const meshById = new Map();

// ── Étoiles de fond ──────────────────────────────
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(3000);
for (let i = 0; i < 3000; i++) {
  starPos[i] = (Math.random() - 0.5) * 800;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
scene.add(
  new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 })
  )
);

// ── Données des planètes ─────────────────────────
// orbitR = distance au Soleil (unités Three.js)
// speed  = vitesse de rotation (arbitraire, pas réaliste)
const planetsData = [
  {
    id: "mercury",
    name: "Mercure",
    radius: 0.2,
    texturePath: "/textures/2k_mercury.jpg",
    orbitR: 5,
    speed: 0.8,
  },
  {
    id: "venus",
    name: "Vénus",
    radius: 0.38,
    texturePath: "/textures/2k_venus_atmosphere.jpg",
    orbitR: 7,
    speed: 0.6,
  },
  {
    id: "earth",
    name: "Terre",
    radius: 0.4,
    texturePath: "/textures/2k_earth_daymap.jpg",
    orbitR: 10,
    speed: 0.5,
    hasMoon: true,
  },
  {
    id: "mars",
    name: "Mars",
    radius: 0.28,
    texturePath: "/textures/2k_mars.jpg",
    orbitR: 13,
    speed: 0.4,
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 1.1,
    texturePath: "/textures/2k_jupiter.jpg",
    orbitR: 19,
    speed: 0.2,
  },
  {
    id: "saturn",
    name: "Saturne",
    radius: 0.9,
    texturePath: "/textures/2k_saturn.jpg",
    orbitR: 25,
    speed: 0.15,
    rings: true,
  },
  {
    id: "uranus",
    name: "Uranus",
    radius: 0.6,
    texturePath: "/textures/2k_uranus.jpg",
    orbitR: 32,
    speed: 0.1,
  },
  {
    id: "neptune",
    name: "Neptune",
    radius: 0.55,
    texturePath: "/textures/2k_neptune.jpg",
    orbitR: 38,
    speed: 0.08,
  },
];

// ── Soleil ───────────────────────────────────────
const sunMesh = createPlanet({
  radius: 2,
  texturePath: "/textures/2k_sun.jpg",
  position: [0, 0, 0],
  emissive: true,
});

sunMesh.userData.id = "sun";
meshById.set("sun", sunMesh);

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
  });

  // On retire le mesh de la scène et on le met sous le pivot
  scene.remove(mesh);
  pivot.add(mesh);
  // On stocke le nom pour les infobulles plus tard
  mesh.userData.name = p.name;
  mesh.userData.id = p.name;
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
  if (p.hasMoon) {
    moonPivot = new THREE.Object3D();
    mesh.add(moonPivot); // attaché à la Terre, pas à la scène

    const moon = createPlanet({
      radius: 0.11,
      texturePath: "/textures/2k_moon.jpg",
      position: [0.8, 0, 0], // distance à la Terre
    });
    scene.remove(moon);
    moonPivot.add(moon);
    moon.userData.name = "Lune";
    moon.userData.id = "moon";
    meshById.set("moon", moon);
  }

  return { pivot, speed: p.speed, moonPivot };
});

// ── Boucle d'animation ────────────────────────────
// t est un compteur de temps qui grandit à chaque frame.
// On multiplie t par speed pour que chaque planète aille à sa vitesse.
let t = 0;
startLoop(() => {
  t += 0.005;
  pivots.forEach(({ pivot, speed, moonPivot }) => {
    pivot.rotation.y = t * speed;
    // La Lune tourne ~13× plus vite que la Terre autour du Soleil
    if (moonPivot) {
      moonPivot.rotation.y = t * 6;
    }
  });

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

buildBackButton(() => zoomToSystem());
