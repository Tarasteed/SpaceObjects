import { scene, startLoop, bloomPass } from "./scene.js";
import {
  createPlanet,
  createSaturnRings,
  createLensFlare,
  createSolarBoiling,
  createAtmosphere,
  createClouds,
  createOrbit,
} from "./objects.js";
import {
  buildSidebar,
  showTooltip,
  hideTooltip,
  buildBackButton,
  showBackButton,
  buildSimControls,
  buildOrbitToggle,
} from "./ui.js";
import { updateCamera, zoomTo, zoomToSystem } from "./camera.js";
import * as THREE from "three";
import { sim } from "./state.js";
import { OBJECTS } from "./data.js";

// ── Données source ────────────────────────────────
// On dérive les sous-ensembles utiles depuis OBJECTS (data.js)
const planetsData = OBJECTS.filter((o) => o.type === "planet");
const sunData = OBJECTS.find((o) => o.id === "sun");
const moonData = OBJECTS.find((o) => o.id === "moon");

// Map id → mesh 3D — permet de cibler une planète depuis la sidebar ou le raycaster
export const meshById = new Map();

// ── Skybox photographique ─────────────────────────
// Grande sphère (r=4000) rendue de l'intérieur avec la carte du ciel NASA.
// renderOrder=-1 garantit qu'elle est dessinée en premier, derrière tout le reste.
// La couleur (0.4, 0.4, 0.4) assombrit la texture de 60% — sans ça elle est trop lumineuse.
function createSkybox() {
  const loader = new THREE.TextureLoader();
  loader.load("/textures/starmap.jpg", (texture) => {
    const geo = new THREE.SphereGeometry(4000, 256, 256); // 256 segments = pas de facettes visibles
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

// ── Étoiles procédurales ──────────────────────────
// 4 groupes d'étoiles (rouges, jaunes, blanches, bleues) pour simuler la diversité stellaire.
// Chaque étoile est un point avec une texture canvas radiale (dégradé blanc → transparent)
// pour éviter les carrés pixelisés. sizeAttenuation=true les rend plus petites à distance.
function createStars() {
  // Texture de base : cercle flou blanc sur fond transparent
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

// ── Soleil ────────────────────────────────────────
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

createLensFlare(sunMesh); // halo de lumière (sprites additifs)
const solarBoiling = createSolarBoiling(sunMesh, sunData.radius); // shader de convection

const cloudMeshes = []; // meshes de nuages à animer séparément (Terre, Vénus)
const orbitLines = []; // toutes les LineLoop d'orbite (planètes + lune) — index 0-7 planètes, 8 lune

// ── Pivots d'orbite ───────────────────────────────
// Chaque planète est enfant d'un Object3D "pivot" placé à l'origine (0,0,0).
// La planète est décalée sur l'axe X de orbitR unités dans l'espace local du pivot.
// Faire tourner le pivot autour de Y fait orbiter la planète — pas besoin de sin/cos manuel.
//
// Hiérarchie :
//   scène
//   └── pivot (tourne en Y) ← inclinaison orbitale sur X
//       └── mesh planète (décalé en X, tourne en Y pour la rotation axiale)
//           └── moonPivot (tourne en Y, pour la Lune)
//               └── moonMesh
const maxOrbitR = Math.max(...planetsData.map((p) => p.orbitR)); // utilisé pour normaliser l'opacité des orbites

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
  orbitLine.userData.pivot = pivot; // référence au pivot pour lire son angle
  orbitLine.userData.speed = p.speed; // vitesse orbitale pour calculer la longueur de traîne

  // L'orbite a la même inclinaison que le pivot mais vit dans la scène (pas dans le pivot)
  // pour éviter une double transformation
  if (p.inclination) {
    orbitLine.rotation.x = THREE.MathUtils.degToRad(p.inclination);
  }

  orbitLine.visible = false; // masquées par défaut, toggle via le bouton Orbites
  scene.add(orbitLine);
  orbitLines.push(orbitLine);

  // ── Mesh planète ──────────────────────────────
  const mesh = createPlanet({
    radius: p.radius,
    texturePath: p.texturePath,
    position: [p.orbitR, 0, 0], // position initiale dans l'espace local du pivot
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
  meshById.set(p.id, mesh); // enregistrement pour le zoom sidebar

  if (p.rings) createSaturnRings(mesh);
  if (p.atmosphere)
    createAtmosphere(mesh, p.atmosphere.color, p.atmosphere.size);

  if (p.clouds) {
    const cloud = createClouds(
      mesh,
      p.clouds.texture,
      p.radius,
      p.clouds.opacity
    );
    cloudMeshes.push({ mesh: cloud, speed: p.clouds.speed }); // animé dans la boucle
  }

  // ── Lune ──────────────────────────────────────
  // La Lune est enfant d'un moonPivot lui-même attaché au mesh Terre.
  // Elle hérite donc des transformations de la Terre (position orbitale, rotation axiale).
  // Résultat : la Lune orbite autour de la Terre, qui orbite autour du Soleil.
  //
  // moonOrbit (l'ellipse visuelle) est aussi attachée à la Terre — elle se déplace
  // avec elle dans la scène tout en restant correctement positionnée autour d'elle.
  let moonPivot = null;
  let moonMesh = null;

  if (p.hasMoon) {
    moonPivot = new THREE.Object3D();
    mesh.add(moonPivot);

    moonMesh = createPlanet({
      radius: moonData.radius,
      texturePath: moonData.texturePath,
      position: [moonData.orbitR, 0, 0],
    });
    scene.remove(moonMesh);
    moonPivot.add(moonMesh);

    const moonOrbit = createOrbit(
      moonData.orbitR,
      new THREE.Color(0.5, 0.5, 0.6),
      maxOrbitR
    );

    // Pour la traîne : on référence moonPivot (angle local) plutôt que le pivot Terre
    // Les vertices de moonOrbit sont dans l'espace local de la Terre → même logique que les planètes
    moonOrbit.userData.moonPivotRef = moonPivot;
    moonOrbit.userData.speed = moonData.orbitalSpeed;

    moonOrbit.visible = false;
    mesh.add(moonOrbit); // attachée à la Terre — suit son déplacement automatiquement
    orbitLines.push(moonOrbit); // index 8 (après les 8 planètes)

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

// ── Traînes orbitales ─────────────────────────────
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

  orbitLines.forEach((line) => {
    if (!line.visible) return;

    const segments = line.userData.segments;
    const color = line.userData.color;
    const orbitR = line.userData.orbitR;
    const maxR = line.userData.maxOrbitR;
    const colorAttr = line.geometry.getAttribute("color");

    // moonPivotRef pour la lune (espace local Terre), pivot pour les planètes (espace monde)
    // La logique est identique dans les deux cas : rotation.y dans l'espace des vertices
    const pivotRef = line.userData.moonPivotRef ?? line.userData.pivot;
    if (!pivotRef) return;

    // Conversion : rotation Y Three.js → angle dans le repère des vertices (antihoraire)
    let planetAngle = -pivotRef.rotation.y;
    planetAngle = ((planetAngle % TWO_PI) + TWO_PI) % TWO_PI;

    // Longueur de traîne proportionnelle à la vitesse angulaire réelle (rad/frame)
    // 300 frames ≈ 5 secondes à 60fps — ajuste ce chiffre pour changer la longueur visuelle
    // Math.max(0.5) évite que Neptune (très lente) ait une traîne invisible
    const speed = line.userData.speed ?? 0.1;
    const angularVelocity = 0.005 * sim.speedFactor * speed; // rad avancés par frame
    const BASE_TRAIL = 0.8; // longueur fixe toujours visible (~46°) — augmente pour allonger la base
    const EXT_FRAMES = 2000; // extension à haute vitesse — augmente pour amplifier l'effet
    const trailLength = Math.min(
      BASE_TRAIL + angularVelocity * EXT_FRAMES,
      Math.PI
    );

    // Opacité de base dégradée selon la distance : les orbites lointaines sont plus discrètes
    const baseOpacity = 0.45 - (orbitR / maxR) * 0.25;

    for (let i = 0; i <= segments; i++) {
      const vertAngle = (i / segments) * TWO_PI;

      // delta = distance angulaire entre ce vertex et la planète
      // normalisé entre 0 et 2π : delta=0 → planète, delta=trailLength → fin de traîne
      let delta = vertAngle - planetAngle;
      delta = ((delta % TWO_PI) + TWO_PI) % TWO_PI;

      let alpha;
      if (delta <= trailLength) {
        // Dans la traîne — dégradé quadratique : vif près de la planète, s'efface vers la queue
        const frac = 1 - delta / trailLength;
        alpha = frac * frac * baseOpacity * 2.2;
      } else {
        // Hors traîne — fantôme très discret pour garder la forme orbitale lisible
        alpha = baseOpacity * 0.06;
      }

      colorAttr.setXYZ(i, color.r * alpha, color.g * alpha, color.b * alpha);
    }

    colorAttr.needsUpdate = true;
  });
}

// ── Boucle d'animation ────────────────────────────
// t est un compteur de temps global qui grandit à chaque frame (sauf en pause).
// Chaque pivot reçoit rotation.y = t * speed — c'est la source unique du mouvement orbital.
// On utilise une valeur absolue (pas un delta) pour que la simulation soit déterministe
// et reproductible à tout moment.
let t = 0;

startLoop(() => {
  // Avance le temps uniquement si la simulation n'est pas en pause
  if (!sim.paused) {
    t += 0.005 * sim.speedFactor;

    // Met à jour le shader de convection solaire (uTime en secondes réelles)
    if (solarBoiling.material.uniforms) {
      solarBoiling.material.uniforms.uTime.value = Date.now() * 0.001;
    }

    // Rotation des couches nuageuses — vitesse et sens propres à chaque planète
    cloudMeshes.forEach(({ mesh, speed }) => {
      mesh.rotation.y += 0.0001 * speed * sim.speedFactor;
    });
  }

  // Animations continues indépendantes de la pause (esthétique pure)
  const now = Date.now() * 0.001;
  starsGroup.rotation.y = now * 0.003; // rotation lente de la voie lactée
  bloomPass.threshold = 0.82 + Math.sin(now * 0.4) * 0.06; // scintillement du bloom solaire

  // Orbites et rotations planétaires
  pivots.forEach(({ pivot, speed, rotSpeed, mesh, moonPivot, moonMesh }) => {
    pivot.rotation.y = t * speed; // position orbitale (angle autour du Soleil)
    mesh.rotation.y = t * rotSpeed; // rotation axiale de la planète

    // La Lune tourne autour de la Terre dans son propre pivot local
    // orbitalSpeed=6 ≈ 13× la vitesse terrestre, comme en réalité
    if (moonPivot) moonPivot.rotation.y = t * moonData.orbitalSpeed;
    if (moonMesh) moonMesh.rotation.y = t * moonData.rotSpeed; // rotation synchrone (face fixe)
  });

  sunMesh.rotation.y = t * 0.037; // rotation propre du Soleil (~27 jours réels)

  updateOrbitTrails(); // recalcule les couleurs vertex des orbites à chaque frame
  updateCamera(); // lerp caméra vers la planète sélectionnée ou retour système
});

// ── Interface utilisateur ─────────────────────────
// La sidebar liste tous les objets de OBJECTS par type.
// Au clic : affiche l'infobulle + zoom caméra vers la planète.
buildSidebar((obj) => {
  showTooltip(obj);
  const mesh = meshById.get(obj.id);
  if (mesh) {
    zoomTo(mesh);
    showBackButton();
  }
});

// Bouton retour : dézoom vers la vue système solaire + cache l'infobulle
buildBackButton(() => {
  zoomToSystem();
  hideTooltip();
});

// HUD pause / vitesse (état géré dans state.js → sim.paused, sim.speedFactor)
buildSimControls();

// Toggle orbites : active/désactive la visibilité de toutes les orbitLines d'un coup
buildOrbitToggle((visible) => {
  orbitLines.forEach((line) => (line.visible = visible));
});
