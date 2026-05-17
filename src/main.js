import { scene, startLoop, bloomPass, camera, controls } from "./scene.js";
import {
  createPlanet,
  createSaturnRings,
  createLensFlare,
  createSolarBoiling,
  createAtmosphere,
  createClouds,
  createOrbit,
  createAsteroidBelt,
  createLabel,
  createUranusRings,
} from "./objects.js";
import {
  clearActiveItem,
  buildSidebar,
  setActiveItem,
  showTooltip,
  hideTooltip,
  buildBackButton,
  showBackButton,
  buildSimControls,
  buildDisplayPanel,
  buildAudioControls,
  updateTooltipSpeed,
  speedToSlider,
  formatSpeed,
} from "./ui.js";
import {
  updateCamera,
  zoomTo,
  zoomToSystem,
  zoomToBelt,
  zoomToKuiper,
  isZooming,
  getCameraMode,
  CameraMode,
  prepareForNewTarget,
} from "./camera.js";
import * as THREE from "three";
import { sim } from "./state.js";
import { OBJECTS } from "./data.js";
import {
  initAudio,
  setMusicVolume,
  toggleMusic,
  playPing,
  playWhoosh,
  playPause,
  playUnpause,
  startAtmoHum,
  startAtmoHumSilent,
  stopAtmoHum,
  pauseAtmoHum,
  resumeAtmoHum,
  setAtmoVolume,
  setAtmoFadeRatio,
  startAsteroidHum,
  stopAsteroidHum,
  pauseAsteroidHum,
  resumeAsteroidHum,
  setAsteroidFadeRatio,
} from "./audio.js";

// #region ── Splash screen ────────────────────────────────────────────────────

document.getElementById("splash-btn").addEventListener("click", () => {
  const btn = document.getElementById("splash-btn");
  if (btn.disabled) return;

  playPing();

  const splash = document.getElementById("splash");
  splash.classList.add("hidden");
  setTimeout(() => splash.remove(), 800);
  initAudio();
});

// #endregion

// #region ── Données source ───────────────────────────────────────────────────

// Sous-ensembles dérivés depuis OBJECTS (data.js) — source de vérité unique
const planetsData = OBJECTS.filter(
  (o) => o.type === "planet" || o.type === "dwarf"
);
const sunData = OBJECTS.find((o) => o.id === "sun");
// Lunes — toutes gérées via extraMoons (parentId)
const extraMoons = OBJECTS.filter((o) => o.parentId); // inclut la Lune — plus de cas spécial
const ATMO_PLANETS = OBJECTS.filter((o) => o.atmosphere !== null);

// #endregion

// #region ── État local ───────────────────────────────────────────────────────

let lastMode = CameraMode.FREE;
let currentPlanetId = null;

// Tracker de transition pause — détecte les changements dans la boucle
// sans brancher de listener sur les boutons
let wasPaused = false;

// Map id → mesh 3D — permet de cibler une planète depuis la sidebar ou le raycaster
export const meshById = new Map();

// Pivots des lunes supplémentaires — animés dans la boucle
const extraMoonPivots = [];

// Tous les CSS2DObject labels — pour le toggle global
const allLabels = [];

let _starsRotation = 0;

// #endregion

// #region ── Utilitaires ──────────────────────────────────────────────────────

// Retourne true si la simulation est effectivement à l'arrêt (pause réelle)
// source de vérité pour bloquer les sons contextuels et les animations
function isSimStopped() {
  return sim.paused;
}

// Survol sidebar — glow emissive + sprite halo indépendant de la taille.
//
// Deux effets combinés :
// 1. emissive boost sur le mesh → bloom amplifie en glow (grandes planètes)
// 2. Sprite halo (gradient radial canvas) attaché au mesh → visible même sur
//    les très petites planètes (Pluton, Éris...) où l'emissive serait trop discrète
//
// Le sprite est créé à la volée au mouseenter et détruit au mouseleave
// pour ne pas polluer la scène avec des sprites permanents inutilisés.
//
// Désactivé si la planète est déjà suivie (currentPlanetId) — pas de glow
// sur une planète qu'on a déjà sélectionnée et qui remplit l'écran.
let _highlightedMesh = null;
let _beltMeshes = null;
let _originalEmissive = null;
let _originalEmissiveIntensity = 0;
let _haloSprite = null;

function highlightBelt(obj) {
  if (obj.id === currentPlanetId) return;
  clearHighlight();

  const instances =
    obj.id === "kuiper-belt" ? kuiperBeltInstances : asteroidBeltInstances;

  _beltMeshes = instances.map(({ mesh }) => mesh);
  _beltMeshes.forEach((mesh) => {
    mesh.material.emissive = new THREE.Color(obj.color);
    mesh.material.emissiveIntensity = 0.6;
  });
}

function highlightPlanet(obj) {
  // Pas de highlight si on follow déjà cette planète
  if (obj.id === currentPlanetId) return;

  clearHighlight();
  const mesh = meshById.get(obj.id);
  if (!mesh || !mesh.material) return;

  _highlightedMesh = mesh;

  // ── Glow emissive ────────────────────────────────────────────────────────
  _originalEmissive = mesh.material.emissive?.clone() ?? null;
  _originalEmissiveIntensity = mesh.material.emissiveIntensity ?? 0;

  if (_originalEmissive !== null) {
    mesh.material.emissive = new THREE.Color(obj.color);
    mesh.material.emissiveIntensity = 0.1;
  }

  // ── Sprite halo ──────────────────────────────────────────────────────────
  // Taille : proportionnelle au radius avec plancher à 2.5 pour les petites
  const radius = mesh.geometry?.boundingSphere?.radius ?? obj.radius ?? 0.5;
  const haloSize = Math.max(radius * 6, 2.5);

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const col = obj.color;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, `rgba(${hexToRgb(col)}, 0.0)`); // centre transparent
  grad.addColorStop(0.45, `rgba(${hexToRgb(col)}, 0.0)`); // vide au centre
  grad.addColorStop(0.6, `rgba(${hexToRgb(col)}, 0.35)`); // anneau coloré
  grad.addColorStop(0.75, `rgba(${hexToRgb(col)}, 0.15)`); // fondu extérieur
  grad.addColorStop(1.0, `rgba(${hexToRgb(col)}, 0.0)`); // bord transparent
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  _haloSprite = new THREE.Sprite(mat);
  _haloSprite.scale.set(haloSize, haloSize, 1);
  mesh.add(_haloSprite);
}

function highlightObject(obj) {
  if (obj.type === "belt") {
    highlightBelt(obj);
    return;
  }
  highlightPlanet(obj);
}

function clearHighlight() {
  if (_beltMeshes) {
    _beltMeshes.forEach((mesh) => {
      mesh.material.emissive = new THREE.Color(0, 0, 0);
      mesh.material.emissiveIntensity = 0;
    });
    _beltMeshes = null;
  }

  if (_haloSprite) {
    _haloSprite.parent?.remove(_haloSprite);
    _haloSprite.material.map?.dispose();
    _haloSprite.material.dispose();
    _haloSprite = null;
  }

  if (_highlightedMesh) {
    if (_originalEmissive) {
      _highlightedMesh.material.emissive = _originalEmissive;
    } else if (_highlightedMesh.material.emissive) {
      _highlightedMesh.material.emissive = new THREE.Color(0, 0, 0);
    }
    _highlightedMesh.material.emissiveIntensity = _originalEmissiveIntensity;
    _highlightedMesh = null;
    _originalEmissive = null;
    _originalEmissiveIntensity = 0;
  }
}

// Met à jour la position world de chaque label chaque frame.
// Le label est dans la scène (pas dans le mesh) pour ne pas tourner avec lui.
const _labelWorldPos = new THREE.Vector3();
function updateLabels() {
  allLabels.forEach(({ label, mesh }) => {
    if (!label.visible) return;
    mesh.getWorldPosition(_labelWorldPos);
    label.position.copy(_labelWorldPos);
  });
}

// Convertit un hex (#rrggbb) en "r, g, b" pour rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// #endregion

// #region ── Pause avec ralentissement progressif ─────────────────────────────

// triggerPause — gère la mise en pause et la reprise.
// À la pause : anime sim.speedFactor vers 0 sur 1s (ease-out) puis pose sim.paused = true.
// À la reprise : anime sim.speedFactor vers speedBeforePause sur 1s (ease-in).
// Le slider, le label et le bouton sont synchronisés à chaque frame de l'animation.
//
// _isPausingSlowly — bloque le tracker wasPaused dans la boucle pendant l'animation
// pour éviter que pauseAtmoHum/resumeAtmoHum interfèrent avec le fade volume.
//
// _fadeRatioTarget — ratio 0→1 lu par la boucle Three.js pour appliquer le fade
// audio en un seul endroit, évitant les conflits entre deux boucles RAF distinctes.

let _pauseRaf = null;
let _isPausingSlowly = false;
let _fadeRatioTarget = 1; // ratio courant du fade — appliqué dans la boucle Three.js

function syncPauseBtn() {
  const btn = document.getElementById("btn-pause");
  if (btn) {
    btn.textContent = sim.paused ? "▶" : "⏸";
    btn.classList.toggle("active", sim.paused);
  }
}

function syncSlider(speed) {
  const slider = document.getElementById("speed-slider");
  const label = document.getElementById("speed-label");
  if (slider) slider.value = speedToSlider(speed);
  if (label) label.textContent = formatSpeed(speed);
}

function triggerPause() {
  if (_pauseRaf) {
    // Annule une animation en cours — restaure la vitesse d'avant et reprend directement
    cancelAnimationFrame(_pauseRaf);
    _pauseRaf = null;
    _isPausingSlowly = false;
    _fadeRatioTarget = 1;
    sim.speedFactor = sim.speedBeforePause;
    syncSlider(sim.speedFactor);
    sim.paused = false;
    syncPauseBtn();
    playUnpause();
    return;
  }

  if (sim.paused) {
    // Reprise — remonte la vitesse progressivement sur 1s (ease-in quadratique)
    sim.paused = false;
    _isPausingSlowly = true;
    _fadeRatioTarget = 0; // part de silence — monte vers 1 dans stepResume
    syncPauseBtn();
    playUnpause();

    // Redémarre l'atmo en silence pour que _fadeRatioTarget monte le volume progressivement
    const mode = getCameraMode();
    if (mode === CameraMode.FOLLOWING) {
      if (ATMO_PLANETS.some((o) => o.id === currentPlanetId)) {
        startAtmoHumSilent();
      }
    }

    const targetSpeed = sim.speedBeforePause;
    const duration = 1000;
    const startTime = performance.now();

    function stepResume(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-in quadratique : démarre doucement, finit vite
      const eased = progress * progress;
      sim.speedFactor = targetSpeed * eased;
      syncSlider(sim.speedFactor);

      // _fadeRatioTarget est lu par la boucle Three.js — pas d'appel audio ici
      _fadeRatioTarget = eased;

      if (progress < 1) {
        _pauseRaf = requestAnimationFrame(stepResume);
      } else {
        sim.speedFactor = targetSpeed;
        syncSlider(targetSpeed);
        _fadeRatioTarget = 1;
        _pauseRaf = null;
        _isPausingSlowly = false;
      }
    }

    _pauseRaf = requestAnimationFrame(stepResume);
  } else {
    // Mise en pause — ralentissement progressif sur 1s (ease-out quadratique)
    sim.speedBeforePause = sim.speedFactor;
    _isPausingSlowly = true;
    _fadeRatioTarget = 1; // part du volume normal — descend vers 0 dans step
    playPause();
    syncPauseBtn();

    const duration = 1000;
    const startSpeed = sim.speedFactor;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-out quadratique : démarre vite, finit doucement
      const eased = 1 - (1 - progress) * (1 - progress);
      sim.speedFactor = startSpeed * (1 - eased);
      syncSlider(sim.speedFactor);

      // _fadeRatioTarget est lu par la boucle Three.js — pas d'appel audio ici
      _fadeRatioTarget = 1 - eased;

      if (progress < 1) {
        _pauseRaf = requestAnimationFrame(step);
      } else {
        sim.speedFactor = 0;
        sim.paused = true;
        _isPausingSlowly = false;
        _pauseRaf = null;
        _fadeRatioTarget = 1; // remet à 1 pour la prochaine reprise
        syncSlider(0);
        syncPauseBtn();
      }
    }

    _pauseRaf = requestAnimationFrame(step);
  }
}

// #endregion

// #region ── Environnement (skybox + étoiles) ─────────────────────────────────

// Grande sphère (r=4000) rendue de l'intérieur avec la carte du ciel NASA.
// renderOrder=-1 garantit qu'elle est dessinée en premier, derrière tout le reste.
// La couleur (0.4, 0.4, 0.4) assombrit la texture de 60% — sans ça elle est trop lumineuse.
function createSkybox() {
  const loader = new THREE.TextureLoader();
  loader.load("/textures/starmap.jpg", (texture) => {
    const geo = new THREE.SphereGeometry(7000, 256, 256);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      color: new THREE.Color(0.4, 0.4, 0.4),
      depthWrite: false, // ← ajoute
      depthTest: false, // ← ajoute
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -2;
    scene.add(mesh);
  });
}

// 4 groupes d'étoiles (oranges, jaunes, blanches, bleues) pour simuler la diversité stellaire.
// Chaque étoile est un point avec une texture canvas radiale (dégradé blanc → transparent)
// pour éviter les carrés pixelisés. sizeAttenuation=true les rend plus petites à distance.
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

  // Chaque groupe a sa couleur, taille et distance minimale au Soleil
  const starGroups = [
    { count: 12000, color: new THREE.Color("#ffccaa"), size: 0.8, minDist: 80 }, // naines oranges
    { count: 4800, color: new THREE.Color("#fff5e0"), size: 1.0, minDist: 80 }, // naines jaunes
    { count: 1600, color: new THREE.Color("#ffffff"), size: 1.3, minDist: 100 }, // étoiles blanches
    { count: 400, color: new THREE.Color("#aabbff"), size: 2.0, minDist: 120 }, // géantes bleues
  ];

  const starsGroup = new THREE.Group();

  starGroups.forEach((group) => {
    const positions = [];
    for (let i = 0; i < group.count; i++) {
      // Distribution sphérique uniforme (méthode trigonométrique)
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
      alphaTest: 0.01, // évite les artefacts de tri de transparence
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.5, // légèrement > 1 pour compenser le blending additif
      depthWrite: false,
      depthTest: true,
    });
    starsGroup.add(new THREE.Points(geo, mat));
  });

  scene.add(starsGroup);
  return starsGroup;
}

createSkybox();
const starsGroup = createStars();

// #endregion

// #region ── Galaxie lointaine ─────────────────────────────────────────────────

// Plan 3D horizontal représentant la galaxie vue de l'extérieur.
// Contrairement au Sprite (qui fait toujours face à la caméra), le Mesh permet
// de tourner autour de la galaxie et de la voir de côté/de dessous.
// Le système solaire est dans un bras spiral — le plan est décalé pour que
// l'origine (0,0,0) ne soit pas au centre de la galaxie.
// Fade in/out selon camera.position.length().
const GALAXY_NEAR = 800; // commence à apparaître à partir de cette distance
const GALAXY_FULL = 2000; // pleinement visible à cette distance

// const galaxyTex = new THREE.TextureLoader().load("/textures/galaxy.jpg");
const galaxyTex = new THREE.TextureLoader().load("/textures/galaxyTransp.png");
const galaxyMat = new THREE.MeshBasicMaterial({
  map: galaxyTex,
  color: new THREE.Color(0.6, 0.6, 0.7), // ← assombrit et bleutit légèrement
  transparent: true,
  opacity: 0,
  depthWrite: false,
  depthTest: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});

const galaxyMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(8000, 8000),
  galaxyMat
);
galaxyMesh.rotation.x = Math.PI / 2; // couché dans le plan orbital (horizontal)
galaxyMesh.rotation.z = THREE.MathUtils.degToRad(63);
// Décalé pour que le système solaire (origine) soit dans un bras spiral
// et non au centre de la galaxie
galaxyMesh.position.set(600, 0, 0);
galaxyMesh.renderOrder = -1;
scene.add(galaxyMesh);

// #endregion

// #region ── Soleil ───────────────────────────────────────────────────────────

// MeshBasicMaterial (via emissive=true dans createPlanet) — ignore les lumières,
// donc il paraît toujours pleinement éclairé de lui-même.
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
const solarBoiling = createSolarBoiling(sunMesh, sunData.radius);

// #endregion

// #region ── Planètes, orbites et Lune ────────────────────────────────────────

const cloudMeshes = []; // meshes de nuages à animer séparément (Terre, Vénus)
const orbitLines = []; // toutes les LineLoop d'orbite (planètes + lune)

// Chaque planète est enfant d'un Object3D "pivot" placé à l'origine (0,0,0).
// La planète est décalée sur l'axe X de orbitR unités dans l'espace local du pivot.
// Faire tourner le pivot autour de Y fait orbiter la planète — pas besoin de sin/cos manuel.
//
// Hiérarchie :
//   scène
//   └── pivot (tourne en Y) ← inclinaison orbitale sur X
//       └── mesh planète (décalé en X, tourne en Y pour la rotation axiale)
//           └── pivot lune (via extraMoons, même pattern)
const maxOrbitR = Math.max(...planetsData.map((p) => p.orbitR));

const pivots = planetsData.map((p) => {
  const pivot = new THREE.Object3D();
  scene.add(pivot);

  // Inclinaison orbitale (ex: Mercure 7°, Mars 1.85°) — rotation du plan orbital
  if (p.inclination) {
    pivot.rotation.x = THREE.MathUtils.degToRad(p.inclination);
  }

  const orbitColor = p.orbitColor
    ? new THREE.Color(...p.orbitColor)
    : new THREE.Color(0.3, 0.6, 1.0);

  // createOrbit retourne un LineLoop avec vertexColors dynamiques (pour la traîne)
  // userData.pivot et userData.speed sont utilisés par updateOrbitTrails()
  const orbitLine = createOrbit(p.orbitR, orbitColor, maxOrbitR);
  orbitLine.userData.pivot = pivot;
  orbitLine.userData.speed = p.speed;

  // L'orbite a la même inclinaison que le pivot mais vit dans la scène (pas dans le pivot)
  // pour éviter une double transformation
  if (p.inclination) {
    orbitLine.rotation.x = THREE.MathUtils.degToRad(p.inclination);
  }

  orbitLine.visible = false;
  scene.add(orbitLine);
  orbitLines.push(orbitLine);

  const mesh = createPlanet({
    radius: p.radius,
    texturePath: p.texturePath,
    position: [p.orbitR, 0, 0],
    roughness: p.roughness ?? 0.8,
    nightTexturePath: p.nightTexturePath ?? null,
  });

  // Inclinaison axiale (ex: Terre 23.44°, Uranus 97.77°) — appliquée sur le mesh,
  // pas le pivot, pour ne pas affecter le plan orbital
  if (p.axialTilt) {
    mesh.rotation.z = THREE.MathUtils.degToRad(p.axialTilt);
  }

  // createPlanet ajoute le mesh à la scène par défaut — on le retire pour le mettre sous le pivot
  scene.remove(mesh);
  pivot.add(mesh);

  mesh.userData.name = p.name;
  mesh.userData.id = p.id;
  meshById.set(p.id, mesh);
  allLabels.push(createLabel(mesh, p.name, p.color, scene));

  if (p.rings)
    createSaturnRings(mesh, p.radius, p.ringsInnerRatio, p.ringsOuterRatio);
  if (p.uranusRings) createUranusRings(mesh, p.radius);
  if (p.atmosphere)
    createAtmosphere(mesh, p.atmosphere.color, p.atmosphere.size);

  if (p.clouds) {
    const cloud = createClouds(
      mesh,
      p.clouds.texture,
      p.radius,
      p.clouds.opacity
    );
    cloudMeshes.push({ mesh: cloud, speed: p.clouds.speed });
  }

  return { pivot, speed: p.speed, rotSpeed: p.rotSpeed, mesh };
});

// #endregion

// #region ── Lunes supplémentaires ────────────────────────────────────────────

// Construites après le loop planètes pour que meshById soit peuplé.
// Chaque lune est enfant d'un pivot attaché au mesh parent (même pattern que la Lune).
// L'orbite (orbitLine) est attachée au mesh parent — elle se déplace avec lui.
const clickableMeshes = [...meshById.values()];

extraMoons.forEach((moonDef) => {
  const parentMesh = meshById.get(moonDef.parentId);
  if (!parentMesh) return;

  const pivot = new THREE.Object3D();
  parentMesh.add(pivot);

  const orbitColor = new THREE.Color(0.4, 0.4, 0.5);
  const moonOrbit = createOrbit(moonDef.orbitR, orbitColor, maxOrbitR);
  moonOrbit.userData.moonPivotRef = pivot;
  moonOrbit.userData.speed = moonDef.orbitalSpeed;
  moonOrbit.visible = false;
  parentMesh.add(moonOrbit);
  orbitLines.push(moonOrbit);

  const mesh = createPlanet({
    radius: moonDef.radius,
    texturePath: moonDef.texturePath,
    position: [moonDef.orbitR, 0, 0],
    roughness: moonDef.roughness ?? 0.8,
  });
  scene.remove(mesh);
  pivot.add(mesh);

  if (moonDef.atmosphere)
    createAtmosphere(mesh, moonDef.atmosphere.color, moonDef.atmosphere.size);

  mesh.userData.name = moonDef.name;
  mesh.userData.id = moonDef.id;
  meshById.set(moonDef.id, mesh);
  allLabels.push(createLabel(mesh, moonDef.name, moonDef.color, scene));
  clickableMeshes.push(mesh);

  // Rotation dans la boucle — on stocke pivot + speed pour l'animer
  extraMoonPivots.push({
    pivot,
    speed: moonDef.orbitalSpeed,
    rotSpeed: moonDef.rotSpeed,
    mesh,
  });
});

// #endregion

// #region ── Traînes orbitales ────────────────────────────────────────────────

// Chaque orbitLine utilise des vertexColors (BufferAttribute dynamique).
// À chaque frame, on recalcule la couleur de chaque vertex selon son angle relatif
// à la planète : les vertices "derrière" la planète (dans le sens de rotation) sont
// illuminés avec un dégradé quadratique, les autres restent en fantôme très discret.
//
// Sens de rotation Three.js :
//   pivot.rotation.y positif → planète se déplace vers Z négatif (sens horaire vu du dessus)
//   Les vertices sont numérotés de 0 à 2π dans le sens antihoraire (Z positif)
//   → planetAngle = -pivot.rotation.y pour convertir dans le même repère que les vertices
//   → les vertices "derrière" ont un vertAngle > planetAngle (delta = vertAngle - planetAngle)
//
// Longueur de traîne :
//   calée sur la vitesse angulaire réelle (rad/frame) × un nombre de frames fixe,
//   avec un minimum pour que les planètes lentes restent visibles.
function updateOrbitTrails() {
  const TWO_PI = Math.PI * 2;
  const BASE_TRAIL = 0.8; // longueur fixe toujours visible (~46°)
  const EXT_FRAMES = 2000; // extension à haute vitesse

  orbitLines.forEach((line) => {
    if (!line.visible) return;

    const segments = line.userData.segments;
    const color = line.userData.color;
    const orbitR = line.userData.orbitR;
    const maxR = line.userData.maxOrbitR;
    const colorAttr = line.geometry.getAttribute("color");

    // moonPivotRef pour la lune (espace local Terre), pivot pour les planètes (espace monde)
    const pivotRef = line.userData.moonPivotRef ?? line.userData.pivot;
    if (!pivotRef) return;

    // Conversion : rotation Y Three.js → angle dans le repère des vertices (antihoraire)
    let planetAngle = -pivotRef.rotation.y;
    planetAngle = ((planetAngle % TWO_PI) + TWO_PI) % TWO_PI;

    const speed = line.userData.speed ?? 0.1;
    const angularVelocity = 0.005 * sim.speedFactor * speed;
    const trailLength = Math.min(
      BASE_TRAIL + angularVelocity * EXT_FRAMES,
      Math.PI
    );

    // Opacité de base dégradée selon la distance : les orbites lointaines sont plus discrètes
    const baseOpacity = 0.45 - (orbitR / maxR) * 0.25;

    for (let i = 0; i <= segments; i++) {
      const vertAngle = (i / segments) * TWO_PI;

      // delta = distance angulaire entre ce vertex et la planète,
      // normalisé entre 0 et 2π : delta=0 → planète, delta=trailLength → fin de traîne
      let delta = vertAngle - planetAngle;
      delta = ((delta % TWO_PI) + TWO_PI) % TWO_PI;

      // Augmente l'opacité du fantôme selon la distance (orbites lointaines plus visibles)
      const ghostBoost = 0.08 + (orbitR / maxR) * 0.2;
      const ghostAlpha = baseOpacity * ghostBoost;

      let alpha;
      if (delta <= trailLength) {
        const frac = 1 - delta / trailLength;
        const trailAlpha = frac * frac * baseOpacity * 2.2;
        // Crossfade sur les derniers 20% de la traîne pour éviter le "trou" d'opacité
        const blend = Math.min(1, (trailLength - delta) / (trailLength * 0.2));
        alpha = trailAlpha * blend + ghostAlpha * (1 - blend);
      } else {
        alpha = ghostAlpha;
      }

      colorAttr.setXYZ(i, color.r * alpha, color.g * alpha, color.b * alpha);
    }

    colorAttr.needsUpdate = true;
  });
}

// #endregion

// #region ── Ceintures ────────────────────────────────────────────────────────

// Ceinture principale — entre Mars (orbitR=22) et Jupiter (orbitR=32)
const asteroidBeltInstances = createAsteroidBelt({
  innerRadius: 25,
  outerRadius: 28,
  count: window.innerWidth <= 768 ? 1000 : 2000,
  ySpread: 0.6,
});

// Ceinture de Kuiper — au-delà de Neptune (orbitR=66), englobe les planètes naines
const kuiperBeltInstances = createAsteroidBelt({
  innerRadius: 70,
  outerRadius: 85,
  count: window.innerWidth <= 768 ? 1000 : 4000,
  ySpread: 3.0,
  sizeScale: 2,
});

// Object3D réutilisé chaque frame pour mettre à jour les matrices des instances
const _dummy = new THREE.Object3D();

// #endregion

// #region ── Labels ceintures ─────────────────────────────────────────────────

// Ancres fictives au bord droit de chaque ceinture — même pattern que les planètes.
// Position X = rayon moyen de la ceinture, Y légèrement au-dessus du plan orbital.
const beltLabelData = [
  {
    id: "asteroid-belt",
    name: "Ceinture d'astéroïdes",
    color: "#8a7a6a",
    r: (25 + 28) / 2,
  },
  {
    id: "kuiper-belt",
    name: "Ceinture de Kuiper",
    color: "#7a8a9a",
    r: (70 + 85) / 2,
  },
];

const beltLabels = beltLabelData.map(({ name, color, r }) => {
  const anchor = new THREE.Object3D();
  anchor.position.set(r, 0.5, 0);
  scene.add(anchor);
  const labelData = createLabel(anchor, name, color, scene);
  allLabels.push(labelData);
  return labelData;
});

// Set pour filtrage rapide dans buildDisplayPanel — exclut les ceintures du toggle planètes
const beltLabelSet = new Set(beltLabels.map(({ label }) => label));

// #endregion

// #region ── Boucle d'animation ───────────────────────────────────────────────

// t est un compteur de temps global qui grandit à chaque frame (sauf en pause).
// Chaque pivot reçoit rotation.y = t * speed — source unique du mouvement orbital.
// Valeur absolue (pas un delta) → simulation déterministe et reproductible.
let t = 0;

startLoop(() => {
  // ── Avance la simulation ─────────────────────────────────────────────────
  if (!sim.paused) {
    t += 0.005 * sim.speedFactor;

    cloudMeshes.forEach(({ mesh, speed }) => {
      mesh.rotation.y += 0.0001 * speed * sim.speedFactor;
    });

    // Boucle sur les deux ceintures — même logique, évite la duplication
    [...asteroidBeltInstances, ...kuiperBeltInstances].forEach(
      ({ mesh, instanceData }) => {
        instanceData.forEach((ast, i) => {
          ast.angle += ast.orbitSpeed * 0.005 * sim.speedFactor;
          ast.rotX += ast.rotSpeedX * sim.speedFactor;
          ast.rotY += ast.rotSpeedY * sim.speedFactor;
          ast.rotZ += ast.rotSpeedZ * sim.speedFactor;

          _dummy.position.set(
            Math.cos(ast.angle) * ast.radius,
            ast.inclination,
            Math.sin(ast.angle) * ast.radius
          );
          _dummy.rotation.set(ast.rotX, ast.rotY, ast.rotZ);
          _dummy.scale.setScalar(ast.size);
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    );
  }

  if (!isSimStopped() && solarBoiling.material.uniforms) {
    solarBoiling.material.uniforms.uTime.value = Date.now() * 0.001;
  }

  // ── Gestion pause/reprise audio ──────────────────────────────────────────
  // Détecte les transitions sim.paused ↔ running à chaque frame via wasPaused.
  // Bloqué pendant _isPausingSlowly — triggerPause gère le volume via _fadeRatioTarget.
  // On utilise pause/resume (pas stop/start) pour éviter de recréer les sources audio.
  if (sim.paused !== wasPaused && !_isPausingSlowly) {
    wasPaused = sim.paused;
    const mode = getCameraMode();

    if (sim.paused) {
      if (mode === CameraMode.FOLLOWING) pauseAtmoHum();
      pauseAsteroidHum();
    } else {
      if (mode === CameraMode.FOLLOWING) {
        if (ATMO_PLANETS.some((o) => o.id === currentPlanetId)) resumeAtmoHum();
      }
      const isBelt =
        currentPlanetId === "asteroid-belt" ||
        currentPlanetId === "kuiper-belt";
      if (isBelt) resumeAsteroidHum();
    }
  }

  // ── Fade audio pendant ralentissement/accélération ───────────────────────
  // _fadeRatioTarget est posé par triggerPause à chaque frame RAF.
  // On applique ici depuis la boucle Three.js — une seule boucle touche au volume,
  // évitant les conflits entre deux RAF indépendants.
  if (_isPausingSlowly) {
    setAtmoFadeRatio(_fadeRatioTarget);
    setAsteroidFadeRatio(_fadeRatioTarget);
  }

  // ── Animations continues (gelées en pause) ───────────────────────────────
  const now = Date.now() * 0.001;
  if (!isSimStopped()) {
    // Rotation accumulée via delta × speedFactor — ralentit avec la simulation
    _starsRotation += 0.00003 * sim.speedFactor;
    starsGroup.rotation.y = _starsRotation;
    bloomPass.threshold = 0.82 + Math.sin(now * 0.4) * 0.06;
  }

  pivots.forEach(({ pivot, speed, rotSpeed, mesh }) => {
    pivot.rotation.y = t * speed;
    mesh.rotation.y = t * rotSpeed;
  });

  sunMesh.rotation.y = t * 0.037;

  extraMoonPivots.forEach(({ pivot, speed, rotSpeed, mesh }) => {
    pivot.rotation.y = t * speed;
    mesh.rotation.y = t * rotSpeed;
  });

  updateOrbitTrails();
  updateCamera();
  updateLabels();

  // ── Fade galaxie selon distance caméra ───────────────────────────────────
  // Le mesh est fixe dans la scène — seule l'opacité varie selon la distance.
  // Visible de dessus (plat), de côté (fine tranche) et de dessous.
  const camDist = camera.position.length();
  galaxyMat.opacity = Math.max(
    0,
    Math.min(0.5, (camDist - GALAXY_NEAR) / (GALAXY_FULL - GALAXY_NEAR))
  );

  // Raycasting curseur — relancé à chaque frame pour détecter quand une planète
  // sort de sous le pointeur immobile (le mousemove ne se déclenche pas dans ce cas)
  if (_cursorOnCanvas) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickableMeshes, false);
    // Pas de pulse si on follow déjà la planète survolée
    const onPlanet =
      hits.length > 0 && hits[0].object.userData.id !== currentPlanetId;
    document.body.classList.toggle("cursor-planet", onPlanet);
    if (_cursorPulse) _cursorPulse.classList.toggle("active", onPlanet);
  }

  // Vitesse orbitale live dans la tooltip — jitter ±JITTER_RANGE km/s/frame
  const orbitObj = OBJECTS.find((o) => o.id === currentPlanetId);
  updateTooltipSpeed(
    orbitObj,
    getCameraMode() === CameraMode.FOLLOWING && !isSimStopped()
  );

  // ── Volume hum atmosphérique variable selon distance ─────────────────────
  // Actif uniquement en FOLLOWING sur une planète avec atmosphère, simulation running.
  // Ignoré pendant _isPausingSlowly — le fade est géré par _fadeRatioTarget.
  if (
    getCameraMode() === CameraMode.FOLLOWING &&
    !isSimStopped() &&
    !_isPausingSlowly
  ) {
    const atmoObj = ATMO_PLANETS.find((o) => o.id === currentPlanetId);
    if (atmoObj) {
      const planetMesh = meshById.get(currentPlanetId);
      if (planetMesh) {
        const planetPos = new THREE.Vector3();
        planetMesh.getWorldPosition(planetPos);
        const dist = camera.position.distanceTo(planetPos);
        const radius = planetMesh.geometry.boundingSphere?.radius ?? 1;

        const minDist = radius * 1.5;
        const maxDist = radius * 1.5 + radius * 12;
        const tVol = Math.max(
          0,
          Math.min(1, 1 - (dist - minDist) / (maxDist - minDist))
        );
        setAtmoVolume(tVol * 0.25);
      }
    }
  }

  // ── Transitions audio + effet zoom ───────────────────────────────────────
  // Déclenché uniquement au changement de mode (pas à chaque frame) via lastMode.
  // ZOOMING est ignoré pour l'audio — on attend FOLLOWING pour les sons contextuels,
  // évitant un déclenchement prématuré pendant le lerp de zoom.
  const mode = getCameraMode();
  if (mode !== lastMode) {
    if (mode === CameraMode.ZOOMING) {
      document.body.classList.add("zooming");
    } else {
      document.body.classList.remove("zooming");
    }

    if (mode === CameraMode.FOLLOWING) {
      if (ATMO_PLANETS.some((o) => o.id === currentPlanetId)) {
        if (!isSimStopped()) startAtmoHum();
      } else {
        stopAtmoHum();
      }
    } else if (mode === CameraMode.ZOOMING) {
      // Pas d'action — on attend d'être en FOLLOWING
    } else {
      // FREE ou RETURNING — coupe tout
      stopAtmoHum();
    }
    lastMode = mode;
  }
});

// #endregion

// #region ── Interface utilisateur ────────────────────────────────────────────

buildAudioControls(
  (v) => setMusicVolume(v),
  () => toggleMusic()
);

// La sidebar liste tous les objets de OBJECTS par type.
// Au clic : affiche l'infobulle + zoom caméra vers la planète.
buildSidebar(
  (obj) => {
    currentPlanetId = obj.id;
    document.title = `3D Space Objects - ${obj.name}`;
    playPing();
    showTooltip(obj);
    clearHighlight();

    if (obj.id === "asteroid-belt" || obj.id === "kuiper-belt") {
      // Ne stoppe pas si déjà en train de jouer — évite le cut entre ceintures
      if (!isSimStopped()) startAsteroidHum();
      obj.id === "kuiper-belt" ? zoomToKuiper() : zoomToBelt();
      showBackButton();
      return;
    }

    // Planète — stoppe le son ceinture uniquement si on quitte une ceinture
    stopAsteroidHum();

    const mesh = meshById.get(obj.id);
    if (!mesh) return;

    prepareForNewTarget();
    zoomTo(mesh);
    showBackButton();
  },
  (obj) => highlightObject(obj),
  () => clearHighlight(),
  (id) => id === currentPlanetId
);

// Bouton retour : dézoom vers la vue système solaire + cache l'infobulle
buildBackButton(() => {
  playWhoosh();
  stopAsteroidHum();
  zoomToSystem();
  hideTooltip();
  clearActiveItem();
  currentPlanetId = null;
  document.title = "3D Space Objects";
});

// Pause — délègue à triggerPause pour le ralentissement progressif
buildSimControls(() => triggerPause());

// Panel Affichage — orbites, labels planètes, labels lunes, labels ceintures
buildDisplayPanel(
  (visible) => {
    orbitLines.forEach((line) => (line.visible = visible));
  },
  (visible) => {
    allLabels
      .filter(
        ({ label, mesh }) =>
          !beltLabelSet.has(label) &&
          !extraMoons.some((m) => m.id === mesh.userData.id)
      )
      .forEach(({ label }) => (label.visible = visible));
  },
  (visible) => {
    allLabels
      .filter(({ mesh }) => extraMoons.some((m) => m.id === mesh.userData.id))
      .forEach(({ label }) => (label.visible = visible));
  },
  (visible) => {
    beltLabels.forEach(({ label }) => (label.visible = visible));
  }
);

// #region ── Masquer tous les HUD au double clic ──────────────────────────────

const canvas = document.getElementById("canvas");

function toggleHud() {
  document.body.classList.toggle("hud-hidden");
}

canvas.addEventListener("dblclick", toggleHud);

// Double-tap mobile — détection via delta de temps entre deux touchend
let _lastTap = 0;
canvas.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - _lastTap < 300) {
      e.preventDefault(); // évite le zoom natif du navigateur sur double-tap
      toggleHud();
    }
    _lastTap = now;
  },
  { passive: false }
);

// #endregion

// #endregion

// #region ── Raycasting ───────────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Détection survol planète — bascule cursor-planet + anime l'overlay #cursor-pulse.
// Relancé à chaque frame dans la boucle pour détecter quand une planète sort
// de sous le pointeur immobile (le mousemove ne se déclenche pas dans ce cas).
const _cursorPulse = document.getElementById("cursor-pulse");
let _cursorRafPending = false;
let _cursorOnCanvas = false;

document.getElementById("canvas").addEventListener("mousemove", (e) => {
  _cursorOnCanvas = true;

  // Déplace l'overlay pulse à chaque mouvement (pas throttlé — doit être fluide)
  if (_cursorPulse) {
    _cursorPulse.style.left = e.clientX + "px";
    _cursorPulse.style.top = e.clientY + "px";
  }

  // Met à jour pointer pour le raycasting statique de la boucle
  const rect = e.target.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});

document.getElementById("canvas").addEventListener("mouseleave", () => {
  _cursorOnCanvas = false;
  document.body.classList.remove("cursor-planet");
  if (_cursorPulse) _cursorPulse.classList.remove("active");
});

document.getElementById("canvas").addEventListener("click", (e) => {
  if (isZooming()) return;

  const rect = e.target.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickableMeshes, false);
  if (hits.length === 0) return;

  const hitMesh = hits[0].object;
  const id = hitMesh.userData.id;
  const obj = OBJECTS.find((o) => o.id === id);
  if (!obj) return;

  // Déjà en follow sur cette planète — on ignore le clic
  if (id === currentPlanetId) return;

  currentPlanetId = id;
  document.title = `3D Space Objects - ${obj.name}`;

  playPing();
  setActiveItem(id);
  showTooltip(obj);
  prepareForNewTarget();
  zoomTo(hitMesh);
  showBackButton();
});

// #endregion

// #region ── Raccourcis clavier ───────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  // Échap — retour vue système depuis n'importe quel mode caméra
  if (e.key === "Escape") {
    playWhoosh();
    stopAsteroidHum();
    zoomToSystem();
    hideTooltip();
    clearActiveItem();
    currentPlanetId = null;
    document.title = "3D Space Objects";
    document.getElementById("btn-back")?.classList.remove("visible");
  }

  // Espace — pause/reprise avec ralentissement progressif
  if (e.key === " ") {
    e.preventDefault(); // évite le scroll navigateur
    triggerPause();
  }

  // P — log position caméra dans la console (debug)
  if (e.key === "p" || e.key === "P") {
    const p = camera.position;
    const tgt = controls.target;
    console.log(
      `position: set(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`
    );
    console.log(
      `lookAt:   set(${tgt.x.toFixed(1)}, ${tgt.y.toFixed(1)}, ${tgt.z.toFixed(
        1
      )})`
    );
  }
});

// #endregion
