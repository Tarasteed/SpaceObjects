import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { loader } from "./loader.js";
import { scene } from "./scene.js";

// #region ── Planètes ─────────────────────────────────────────────────────────

export function createPlanet({
  radius,
  texturePath,
  position,
  emissive = false,
  roughness = 0.8,
  nightTexturePath = null,
}) {
  const geo = new THREE.SphereGeometry(radius, 64, 64);

  let mat;

  // MeshBasicMaterial = ignore les lumières (pour le Soleil)
  // MeshStandardMaterial = réagit aux lumières (pour les planètes)
  if (emissive) {
    mat = new THREE.MeshBasicMaterial({
      map: loader.load(texturePath),
      color: new THREE.Color(1.2, 1.1, 0.9),
    });
  } else if (nightTexturePath) {
    // Terre — matériau avec texture jour + émission nocturne (lumières humaines)
    mat = new THREE.MeshStandardMaterial({
      map: loader.load(texturePath),
      emissiveMap: loader.load(nightTexturePath),
      emissive: new THREE.Color(2.0, 1.4, 0.6),
      emissiveIntensity: 0.8,
      roughness: roughness,
      metalness: 0.0,
    });
  } else {
    mat = new THREE.MeshStandardMaterial({
      map: loader.load(texturePath),
      roughness: roughness,
      metalness: 0.0,
    });
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}

// #endregion

// #region ── Anneaux de Saturne ───────────────────────────────────────────────

export function createSaturnRings(
  saturnMesh,
  radius,
  innerRatio = 1.24,
  outerRatio = 2.26
) {
  const innerRadius = radius * innerRatio;
  const outerRadius = radius * outerRatio;
  const geo = new THREE.RingGeometry(innerRadius, outerRadius, 128);

  // Fix UVs — mappe la texture radialement du centre vers l'extérieur
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const normalized =
      (v3.length() - innerRadius) / (outerRadius - innerRadius);
    uv.setXY(i, normalized, 0);
  }
  uv.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: loader.load("/textures/8k_saturn_ring_alpha.png"),
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.01, // ignore les pixels quasi-transparents
    roughness: 0.8,
    metalness: 0.0,
  });

  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI / 2;
  saturnMesh.add(ring);
}

// #endregion

// #region ── Anneaux d'Uranus ────────────────────────────────────────────────────

// 13 anneaux procéduraux basés sur les données NASA réelles.
// Rayons et largeurs convertis depuis km vers unités 3D (radius Uranus = 1.1u = 25362km).
// Les anneaux fins ont une largeur minimale de 0.012u pour rester visibles.
// MeshBasicMaterial — indépendant de la PointLight solaire.
// Opacités très basses (0.03–0.28) : les anneaux d'Uranus sont sombres et discrets.
export function createUranusRings(uranusMesh, radius) {
  // Données NASA : ζ, 6, 5, 4, α, β, η, γ, δ, λ, ε, ν, μ
  // inner/outer = multiples du radius 3D (1.1u), opacity = 0..1
  const rings = [
    { inner: 1.6481, outer: 1.7566, opacity: 0.02 }, // ζ (zeta) — très diffus
    { inner: 1.8146, outer: 1.8266, opacity: 0.05 }, // 6
    { inner: 1.8318, outer: 1.8438, opacity: 0.05 }, // 5
    { inner: 1.8464, outer: 1.8584, opacity: 0.045 }, // 4
    { inner: 1.9395, outer: 1.9515, opacity: 0.065 }, // α
    { inner: 1.9804, outer: 1.9924, opacity: 0.06 }, // β
    { inner: 2.0461, outer: 2.0581, opacity: 0.04 }, // η
    { inner: 2.0657, outer: 2.0777, opacity: 0.045 }, // γ
    { inner: 2.0949, outer: 2.1069, opacity: 0.06 }, // δ
    { inner: 2.1696, outer: 2.1816, opacity: 0.035 }, // λ — très fin
    { inner: 2.2184, outer: 2.2304, opacity: 0.14 }, // ε — le plus large et brillant
    { inner: 2.8669, outer: 3.0317, opacity: 0.01 }, // ν — diffus
    { inner: 3.73, outer: 4.4673, opacity: 0.008 }, // μ — très diffus
  ];

  const group = new THREE.Group();

  rings.forEach(({ inner, outer, opacity }) => {
    const innerR = radius * inner;
    const outerR = radius * outer;
    const geo = new THREE.RingGeometry(innerR, outerR, 128);

    // Fix UVs radiaux
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      uv.setXY(i, (v3.length() - innerR) / (outerR - innerR), 0);
    }
    uv.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.3, 0.3, 0.32),
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    group.add(new THREE.Mesh(geo, mat));
  });

  // rotation.x = PI/2 dans l'espace local du mesh —
  // Uranus étant incliné à 97.77° via axialTilt, les anneaux
  // apparaissent quasi verticaux dans la scène.
  group.rotation.x = Math.PI / 2;
  uranusMesh.add(group);
  return group;
}

// #endregion

// #region ── Effets visuels du Soleil ─────────────────────────────────────────

export function createLensFlare(sunMesh) {
  loader.load("/textures/lensflare0.png", (tex) => {
    // Couche 1 — rayons proches, moyennement intenses
    const mat1 = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.01,
      color: new THREE.Color(1.0, 0.8, 0.4),
    });
    const sprite1 = new THREE.Sprite(mat1);
    sprite1.scale.set(12, 12, 1);
    sunMesh.add(sprite1);

    // Couche 2 — rayons lointains, très subtils
    const mat2 = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.035,
      color: new THREE.Color(1.0, 0.7, 0.3),
    });
    const sprite2 = new THREE.Sprite(mat2);
    sprite2.scale.set(40, 40, 1);
    sunMesh.add(sprite2);

    // Couche 3 — halo très lointain, quasi invisible
    const mat3 = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.0015,
      color: new THREE.Color(1.0, 0.6, 0.2),
    });
    const sprite3 = new THREE.Sprite(mat3);
    sprite3.scale.set(175, 175, 1);
    sunMesh.add(sprite3);
  });
}

export function createSolarBoiling(sunMesh, radius) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;

      // Hash 2D simple et stable — pas de simplex
      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      // Noise smooth interpolé
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i),             hash(i + vec2(1,0)), u.x),
          mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
          u.y
        );
      }

      // FBM — plusieurs octaves pour les cellules de convection
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p  = p * 2.1 + vec2(1.7, 9.2);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 p = vUv * 5.0;
        float t1 = uTime * 0.1;
        float t2 = uTime * 0.5;

        // Deux couches de bruit décalées dans le temps
        float n1 = fbm(p + vec2(t1, t2));
        float n2 = fbm(p * 1.5 - vec2(t2, t1) + n1 * 0.4);

        float cell = mix(n1, n2, 0.45);

        // Cellules de convection — zones chaudes/froides
        float hot = smoothstep(0.45, 0.75, cell);

        // Couleur : rouge sombre (cellule froide) → jaune vif (cellule chaude)
        vec3 col = mix(
          vec3(0.8, 0.1, 0.0),
          vec3(1.0, 0.9, 0.3),
          hot
        );

        float alpha = hot * 0.6;

        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
  });

  const overlay = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.008, 64, 64),
    mat
  );

  scene.add(overlay);
  return overlay;
}

// #endregion

// #region ── Atmosphères et nuages ────────────────────────────────────────────

export function createAtmosphere(mesh, color, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, `rgba(${color}, 0.12)`);
  gradient.addColorStop(0.3, `rgba(${color}, 0.10)`);
  gradient.addColorStop(0.6, `rgba(${color}, 0.06)`);
  gradient.addColorStop(0.8, `rgba(${color}, 0.03)`);
  gradient.addColorStop(0.92, `rgba(${color}, 0.01)`);
  gradient.addColorStop(1.0, `rgba(${color}, 0.00)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  mesh.add(sprite); // attaché au mesh — suit la planète automatiquement
}

export function createClouds(mesh, texturePath, radius, opacity) {
  const geo = new THREE.SphereGeometry(radius * 1.02, 64, 64); // 2% plus grand que la planète
  const mat = new THREE.MeshStandardMaterial({
    map: loader.load(texturePath),
    transparent: true,
    opacity: opacity,
    depthWrite: false,
    roughness: 1.0,
    metalness: 0.0,
  });
  const cloudMesh = new THREE.Mesh(geo, mat);
  mesh.add(cloudMesh); // attaché à la planète — tourne avec elle
  return cloudMesh;
}

// #endregion

// #region ── Orbites ──────────────────────────────────────────────────────────

export function createOrbit(
  orbitR,
  color = new THREE.Color(0.3, 0.6, 1.0),
  maxOrbitR
) {
  // Résolution plus élevée pour les orbites lointaines (planètes naines)
  const segments = orbitR > 70 ? 4096 : 512;
  const positions = [];
  const colors = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR);
    colors.push(0, 0, 0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const colorAttr = new THREE.Float32BufferAttribute(colors, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("color", colorAttr);

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const line = new THREE.LineLoop(geo, mat);
  line.userData.orbitR = orbitR;
  line.userData.segments = segments;
  line.userData.color = color;
  line.userData.maxOrbitR = maxOrbitR;

  return line;
}

// #endregion

// #region ── Étiquettes ──────────────────────────────────────────────────────────

// Crée une étiquette HTML positionnée dans la scène (pas dans le mesh).
// Attachée à la scène pour éviter de tourner avec la rotation axiale du mesh.
// Sa position world est mise à jour chaque frame dans main.js via updateLabels().
// Retourne { label, mesh, radius } pour la mise à jour en boucle.
export function createLabel(mesh, name, color, parentScene) {
  const div = document.createElement("div");
  div.className = "planet-label";
  div.textContent = name;
  div.style.setProperty("--label-color", color);

  const label = new CSS2DObject(div);
  label.position.set(0, 0, 0); // mis à jour chaque frame via getWorldPosition()
  label.visible = false; // masqué par défaut — activé via le toggle

  if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
  const radius = mesh.geometry.boundingSphere?.radius ?? 0.5;

  parentScene.add(label);
  return { label, mesh, radius };
}

// #endregion

// #region ── Ceinture d'astéroïdes ────────────────────────────────────────────

export function createAsteroidBelt({
  innerRadius,
  outerRadius,
  count = 1800,
  ySpread,
  sizeScale = 1.0,
}) {
  // 3 géométries de base déformées pour casser la sphéricité trop régulière
  const baseGeos = [
    new THREE.SphereGeometry(1, 7, 6),
    new THREE.SphereGeometry(1, 6, 5),
    new THREE.SphereGeometry(1, 8, 6),
  ];

  baseGeos.forEach((geo) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // Déformation douce et uniforme — pas de valeurs extrêmes
      const noise = 0.75 + Math.random() * 0.5;
      pos.setX(i, pos.getX(i) * noise);
      pos.setY(i, pos.getY(i) * (0.75 + Math.random() * 0.5));
      pos.setZ(i, pos.getZ(i) * (0.75 + Math.random() * 0.5));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  const textures = [
    loader.load("/textures/asteroid_c.jpg"), // C-type — sombre, carbone
    loader.load("/textures/asteroid_s.jpg"), // S-type — rocheux, silicate
    loader.load("/textures/asteroid_m.jpg"), // M-type — métallique
  ];

  const materials = [
    new THREE.MeshStandardMaterial({
      map: textures[0],
      roughness: 1.0,
      metalness: 0.05,
    }),
    new THREE.MeshStandardMaterial({
      map: textures[1],
      roughness: 0.85,
      metalness: 0.1,
    }),
    new THREE.MeshStandardMaterial({
      map: textures[2],
      roughness: 0.5,
      metalness: 0.6,
    }),
  ];

  // Répartition des types selon la réalité astronomique (C dominant, M rare)
  const typeWeights = [0.6, 0.3, 0.1];
  const counts = typeWeights.map((w) => Math.round(w * count));

  const dummy = new THREE.Object3D();
  const allInstances = [];

  counts.forEach((n, typeIdx) => {
    const geo = baseGeos[typeIdx % baseGeos.length];
    const mat = materials[typeIdx];
    const mesh = new THREE.InstancedMesh(geo, mat, n);

    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const instanceData = [];

    for (let i = 0; i < n; i++) {
      // Distribution radiale non-uniforme : plus dense au centre de la ceinture
      const r =
        innerRadius +
        (outerRadius - innerRadius) * Math.pow(Math.random(), 0.8);

      // Légère ellipticité orbitale (excentricité réaliste)
      const eccentricity = Math.random() * 0.15;
      const angle = Math.random() * Math.PI * 2;
      const rElliptic = r * (1 + eccentricity * Math.cos(angle));

      // Inclinaison individuelle — donne de l'épaisseur à la ceinture
      const inclination = (Math.random() - 0.5) * ySpread;

      // Taille logarithmique — beaucoup de petits, peu de grands
      const size = (0.025 + Math.pow(Math.random(), 2) * 0.04) * sizeScale;

      dummy.position.set(
        Math.cos(angle) * rElliptic,
        inclination,
        Math.sin(angle) * rElliptic
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      instanceData.push({
        angle,
        radius: rElliptic,
        baseRadius: r,
        inclination,
        orbitSpeed: 0.27 / Math.sqrt(r / innerRadius), // loi de Kepler
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.02,
        rotSpeedZ: (Math.random() - 0.5) * 0.02,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        size,
      });
    }

    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    allInstances.push({ mesh, instanceData, typeIdx });
  });

  return allInstances;
}

// #endregion
