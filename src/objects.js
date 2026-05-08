import * as THREE from "three";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";
import { scene } from "./scene.js";

const loader = new THREE.TextureLoader();

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
    // Terre — matériau avec texture jour + émission nocturne
    mat = new THREE.MeshStandardMaterial({
      map: loader.load(texturePath),
      emissiveMap: loader.load(nightTexturePath),
      emissive: new THREE.Color(2.0, 1.4, 0.6), // teinte chaude pour les lumières
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
    alphaTest: 0.01, // ignore les pixels quasi-transparent
    roughness: 0.8,
    metalness: 0.0,
  });

  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI / 2;
  saturnMesh.add(ring);
}

export function createLensFlare(sunMesh) {
  const loader = new THREE.TextureLoader();

  // lensflare0 = texture avec vrais rayons
  loader.load("/textures/lensflare0.png", (tex) => {
    // Couche 1 — rayons proches, moyennement intenses
    const mat1 = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      opacity: 0.02,
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
      opacity: 0.07,
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
      opacity: 0.003,
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

      // FBM — plusieurs octaves pour les cellules
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
        //float hot = smoothstep(0.35, 0.65, cell);

        // Couleur : orange chaud → jaune vif
        vec3 col = mix(
          vec3(0.8, 0.1, 0.0),   // cellule froide — rouge sombre
          vec3(1.0, 0.9, 0.3),   // cellule chaude — jaune vif
          hot
        );

        float alpha = hot * 0.6;  // subtil — juste une texture de surface

        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
  });

  const overlay = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.008, 64, 64), // ← utilise le paramètre
    mat
  );

  scene.add(overlay);
  return overlay;
}

export function createAtmosphere(mesh, color, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, `rgba(${color}, 0.12)`); // centre — léger
  gradient.addColorStop(0.3, `rgba(${color}, 0.10)`); // milieu
  gradient.addColorStop(0.6, `rgba(${color}, 0.06)`); // commence à diminuer
  gradient.addColorStop(0.8, `rgba(${color}, 0.03)`); // fin progressive
  gradient.addColorStop(0.92, `rgba(${color}, 0.01)`); // très fin
  gradient.addColorStop(1.0, `rgba(${color}, 0.00)`); // bord transparent

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
  const geo = new THREE.SphereGeometry(radius * 1.02, 64, 64); // 2% plus grand
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

export function createOrbit(
  orbitR,
  color = new THREE.Color(0.3, 0.6, 1.0),
  maxOrbitR
) {
  const segments = 512;
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

export function createAsteroidBelt({
  innerRadius,
  outerRadius,
  count = 1800, // A tester niveau perfs
  ySpread, // Epaisseur
}) {
  // Création de 3 geométries différentes, dans l'idéale déformées
  const baseGeos = [
    new THREE.SphereGeometry(1, 7, 6),
    new THREE.SphereGeometry(1, 6, 5),
    new THREE.SphereGeometry(1, 8, 6),
  ];

  // Déformation des vertices pour casser la forme sphérique trop régulière
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

  // Répartition des types selon la réalité astronomique
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

      // Inclinaison individuelle (Epaisseur de ceinture, on évite qu'lle soit plate)
      const inclination = (Math.random() - 0.5) * ySpread;

      // Taille : Logarithmique => Beaucpus de petits, peu de grands
      const size = 0.025 + Math.pow(Math.random(), 2) * 0.030;

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
        // Vitesse selon la loi Kepler
        orbitSpeed: 0.27 / Math.sqrt(r / innerRadius),
        rotSpeedX: (Math.random() - 0.5) * 0.02,
        rotSpeedY: (Math.random() - 0.5) * 0.02,
        rotSpeedZ: (Math.random() - 0.5) * 0.02,
        rotX: Math.random() * Math.PI, // ← rotation initiale aléatoire
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        size,
      });
    }

    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    allInstances.push({ mesh, instanceData, typeIdx });
  });

  // Retourné pour la mise à jour dans la boucle
  return allInstances;
}
