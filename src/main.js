import { scene, startLoop, bloomPass, camera } from "./scene.js";
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
} from "./ui.js";
import {
  updateCamera,
  zoomTo,
  zoomToSystem,
  zoomToBelt,
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
  startAtmoHum,
  stopAtmoHum,
  pauseAtmoHum,
  resumeAtmoHum,
  setAtmoVolume,
  startAsteroidHum,
  stopAsteroidHum,
  pauseAsteroidHum,
  resumeAsteroidHum,
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

// Trackers de transition — détectent les changements dans la boucle
// sans brancher de listener sur les boutons
let wasPaused = false;
let wasSpeedZero = false;

// Map id → mesh 3D — permet de cibler une planète depuis la sidebar ou le raycaster
export const meshById = new Map();

// Pivots des lunes supplémentaires — animés dans la boucle
const extraMoonPivots = [];

// Tous les CSS2DObject labels — pour le toggle global
const allLabels = [];

// #endregion

// #region ── Utilitaires ──────────────────────────────────────────────────────

// Retourne true si la simulation est effectivement à l'arrêt
// (pause réelle OU vitesse zéro) — source de vérité pour bloquer les sons contextuels
function isSimStopped() {
  return sim.paused || sim.speedFactor === 0;
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
let _originalEmissive = null;
let _haloSprite = null;

function highlightPlanet(obj) {
  // Pas de highlight si on follow déjà cette planète
  if (obj.id === currentPlanetId) return;

  clearHighlight();
  const mesh = meshById.get(obj.id);
  if (!mesh || !mesh.material) return;

  _highlightedMesh = mesh;

  // ── Glow emissive ────────────────────────────────────────────────────────
  _originalEmissive = mesh.material.emissive?.clone() ?? null;
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

function clearHighlight() {
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
    _highlightedMesh.material.emissiveIntensity = 0;
    _highlightedMesh = null;
    _originalEmissive = null;
  }
}

// Convertit un hex (#rrggbb) en "r, g, b" pour rgba()
// Met à jour la position world de chaque label chaque frame.
// Le label est dans la scène (pas dans le mesh) pour ne pas tourner avec lui.
// On récupère la position world du mesh et on décale en Y de radius + marge.
const _labelWorldPos = new THREE.Vector3();
function updateLabels() {
  allLabels.forEach(({ label, mesh, radius }) => {
    if (!label.visible) return;
    mesh.getWorldPosition(_labelWorldPos);
    label.position.copy(_labelWorldPos);
    // position.y += 0 — label centré sur la planète, le CSS gère le centrage visuel
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// #endregion

// #region ── Environnement (skybox + étoiles) ─────────────────────────────────

// Grande sphère (r=4000) rendue de l'intérieur avec la carte du ciel NASA.
// renderOrder=-1 garantit qu'elle est dessinée en premier, derrière tout le reste.
// La couleur (0.4, 0.4, 0.4) assombrit la texture de 60% — sans ça elle est trop lumineuse.
function createSkybox() {
  const loader = new THREE.TextureLoader();
  loader.load("/textures/starmap.jpg", (texture) => {
    const geo = new THREE.SphereGeometry(4000, 256, 256);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      color: new THREE.Color(0.4, 0.4, 0.4),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -1;
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
// Tous les meshes cliquables — peuplé ici après meshById, complété par extraMoons
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

// #region ── Ceinture d'astéroïdes ────────────────────────────────────────────

// Mars : orbitR=22 — Jupiter : orbitR=32 → la ceinture est bien entre les deux
const asteroidBeltInstances = createAsteroidBelt({
  innerRadius: 25,
  outerRadius: 28,
  count: 2000,
  ySpread: 0.6,
});

// Object3D réutilisé chaque frame pour mettre à jour les matrices des instances
const _dummy = new THREE.Object3D();

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

    asteroidBeltInstances.forEach(({ mesh, instanceData }) => {
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
    });
  }

  if (solarBoiling.material.uniforms) {
    solarBoiling.material.uniforms.uTime.value = Date.now() * 0.001;
  }

  // ── Gestion pause/reprise audio ──────────────────────────────────────────
  // Détecte les transitions sim.paused ↔ running à chaque frame via wasPaused.
  // On utilise pause/resume (pas stop/start) pour éviter de recréer les sources audio.
  // La ceinture utilise audioCtx.suspend()/resume() car BufferSource ne supporte
  // pas la pause native ; l'atmo utilise HTMLAudioElement.pause()/play().
  if (sim.paused !== wasPaused) {
    wasPaused = sim.paused;
    const mode = getCameraMode();

    if (sim.paused) {
      if (mode === CameraMode.FOLLOWING) pauseAtmoHum();
      pauseAsteroidHum();
    } else {
      if (mode === CameraMode.FOLLOWING) {
        if (ATMO_PLANETS.some((o) => o.id === currentPlanetId)) resumeAtmoHum();
      }
      if (currentPlanetId === "asteroid-belt") resumeAsteroidHum();
    }
  }

  // ── Gestion vitesse zéro ─────────────────────────────────────────────────
  // speedFactor=0 arrête la simulation visuellement mais ne change pas sim.paused.
  // On le traite comme une pause audio pour cohérence.
  const isSpeedZero = sim.speedFactor === 0;
  if (isSpeedZero !== wasSpeedZero) {
    wasSpeedZero = isSpeedZero;
    const mode = getCameraMode();

    if (isSpeedZero) {
      if (mode === CameraMode.FOLLOWING) pauseAtmoHum();
      pauseAsteroidHum();
    } else {
      if (mode === CameraMode.FOLLOWING) {
        if (ATMO_PLANETS.some((o) => o.id === currentPlanetId)) resumeAtmoHum();
      }
      if (currentPlanetId === "asteroid-belt") {
        resumeAsteroidHum();
        startAsteroidHum();
      }
    }
  }

  // ── Animations continues (indépendantes de la pause) ────────────────────
  const now = Date.now() * 0.001;
  if (!isSimStopped()) {
    starsGroup.rotation.y = now * 0.003;
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
  if (getCameraMode() === CameraMode.FOLLOWING && !isSimStopped()) {
    const atmoObj = ATMO_PLANETS.find((o) => o.id === currentPlanetId);
    if (atmoObj) {
      const planetMesh = meshById.get(currentPlanetId);
      if (planetMesh) {
        const planetPos = new THREE.Vector3();
        planetMesh.getWorldPosition(planetPos);
        const dist = camera.position.distanceTo(planetPos);
        const radius = planetMesh.geometry.boundingSphere?.radius ?? 1;

        const minDist = radius * 1.5;
        const maxDist = radius * 1.5 + radius * 12; // ← était 6 fixe, maintenant proportionnel
        const t = Math.max(
          0,
          Math.min(1, 1 - (dist - minDist) / (maxDist - minDist))
        );
        setAtmoVolume(t * 0.25);
      }
    }
  }

  // ── Transitions audio selon le mode caméra ───────────────────────────────
  // Déclenché uniquement au changement de mode (pas à chaque frame) via lastMode.
  // ZOOMING est ignoré — on attend FOLLOWING pour démarrer les sons contextuels,
  // évitant un déclenchement prématuré pendant le lerp de zoom.
  const mode = getCameraMode();
  if (mode !== lastMode) {
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
    playPing();
    stopAsteroidHum();
    showTooltip(obj);
    clearHighlight();

    if (obj.id === "asteroid-belt") {
      if (!isSimStopped()) startAsteroidHum();
      zoomToBelt();
      showBackButton();
      return;
    }

    const mesh = meshById.get(obj.id);
    if (!mesh) return;

    prepareForNewTarget();
    zoomTo(mesh);
    showBackButton();
  },
  (obj) => highlightPlanet(obj),
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
});

buildSimControls();

// Panel Affichage — orbites, labels planètes, labels lunes
buildDisplayPanel(
  (visible) => {
    orbitLines.forEach((line) => (line.visible = visible));
  },
  (visible) => {
    allLabels
      .filter(({ mesh }) => !extraMoons.some((m) => m.id === mesh.userData.id))
      .forEach(({ label }) => (label.visible = visible));
  },
  (visible) => {
    allLabels
      .filter(({ mesh }) => extraMoons.some((m) => m.id === mesh.userData.id))
      .forEach(({ label }) => (label.visible = visible));
  }
);

// #region Masquer tous les HUD au double clique

const canvas = document.getElementById("canvas");

function toggleHud() {
  document.body.classList.toggle("hud-hidden");
}

// Double-clic desktop
canvas.addEventListener("dblclick", toggleHud);

// Double-tap mobile
let _lastTap = 0;
canvas.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - _lastTap < 300) {
      e.preventDefault();
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

// Tous les meshes cliquables (planètes + soleil + lune)
// On exclut les anneaux, atmosphères, nuages (pas dans meshById)
// clickableMeshes déclaré plus haut

// Détection survol planète — bascule cursor-planet + anime l'overlay #cursor-pulse.
// Throttlé via RAF pour ne pas spammer le raycaster à chaque pixel.
const _cursorPulse = document.getElementById("cursor-pulse");
let _cursorRafPending = false;
let _cursorOnCanvas = false; // true quand la souris est sur le canvas

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
  playPing();
  setActiveItem(id);
  showTooltip(obj);
  prepareForNewTarget();
  zoomTo(hitMesh);
  showBackButton();
});

// #endregion

// #region ── Raccourcis clavier ───────────────────────────────────────────────

// Touche Échap — retour vue système depuis n'importe quel mode caméra
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    playWhoosh();
    stopAsteroidHum();
    zoomToSystem();
    hideTooltip();
    clearActiveItem();
    currentPlanetId = null;
    document.getElementById("btn-back")?.classList.remove("visible");
  }

  // Espace — pause/reprise simulation (même comportement que le bouton ⏸)
  if (e.key === " ") {
    e.preventDefault(); // évite le scroll navigateur
    if (sim.speedFactor === 0) return; // vitesse zéro — espace sans effet
    sim.paused = !sim.paused;
    // Sync visuel du bouton pause
    const btn = document.getElementById("btn-pause");
    if (btn) {
      btn.textContent = sim.paused ? "▶" : "⏸";
      btn.classList.toggle("active", sim.paused);
    }
  }
});

// #endregion
