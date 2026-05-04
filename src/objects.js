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

export function createSaturnRings(saturnMesh) {
  const innerRadius = 1.4;
  const outerRadius = 2.4;
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

export function createOrbit(orbitR, color = new THREE.Color(0.3, 0.6, 1.0)) {
  const segments = 256; // plus de segments = cercle plus lisse
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * orbitR, 0, Math.sin(angle) * orbitR)
    );
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);

  const mat = new THREE.LineDashedMaterial({
    color: color,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    dashSize: 0.8,
    gapSize: 0.4,
  });

  const line = new THREE.LineLoop(geo, mat);
  return line;
}
