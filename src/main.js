import { scene, startLoop } from './scene.js'
import { createPlanet, createSaturnRings } from './objects.js'
import * as THREE from 'three'

// ── Étoiles de fond ──────────────────────────────
const starGeo = new THREE.BufferGeometry()
const starPos = new Float32Array(3000)
for (let i = 0; i < 3000; i++) {
  starPos[i] = (Math.random() - 0.5) * 800
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
scene.add(new THREE.Points(starGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 })
))

// ── Soleil ───────────────────────────────────────
createPlanet({
  radius: 2,
  texturePath: '/textures/2k_sun.jpg',
  position: [0, 0, 0]
})

// ── Données des planètes ─────────────────────────
// orbitR = distance au Soleil (unités Three.js)
// speed  = vitesse de rotation (arbitraire, pas réaliste)
const planetsData = [
  { name: 'Mercure', radius: 0.2,  texturePath: '/textures/2k_mercury.jpg',  orbitR: 5,  speed: 0.80 },
  { name: 'Vénus',   radius: 0.38, texturePath: '/textures/2k_venus_atmosphere.jpg', orbitR: 7,  speed: 0.60 },
  { name: 'Terre',   radius: 0.4,  texturePath: '/textures/2k_earth_daymap.jpg',     orbitR: 10, speed: 0.50 },
  { name: 'Mars',    radius: 0.28, texturePath: '/textures/2k_mars.jpg',      orbitR: 13, speed: 0.40 },
  { name: 'Jupiter', radius: 1.1,  texturePath: '/textures/2k_jupiter.jpg',   orbitR: 19, speed: 0.20 },
  { name: 'Saturne', radius: 0.9,  texturePath: '/textures/2k_saturn.jpg',    orbitR: 25, speed: 0.15, rings: true },
]

// ── Création des pivots d'orbite ─────────────────
// Un "pivot" est un Object3D invisible placé au centre (0,0,0).
// La planète est son enfant, décalée sur l'axe X de orbitR.
// Faire tourner le pivot fait orbiter la planète autour du Soleil.
const pivots = planetsData.map(p => {
  const pivot = new THREE.Object3D()
  scene.add(pivot)

  // La planète est placée à x=orbitR dans le référentiel du pivot
  const mesh = createPlanet({
    radius: p.radius,
    texturePath: p.texturePath,
    position: [p.orbitR, 0, 0]
  })

  // On retire le mesh de la scène et on le met sous le pivot
  scene.remove(mesh)
  pivot.add(mesh)

  // Anneaux pour Saturne
  if (p.rings) createSaturnRings(mesh)

  // On stocke le nom pour les infobulles plus tard
  mesh.userData.name = p.name

  return { pivot, speed: p.speed }
})

// ── Boucle d'animation ────────────────────────────
// t est un compteur de temps qui grandit à chaque frame.
// On multiplie t par speed pour que chaque planète aille à sa vitesse.
let t = 0
startLoop(() => {
  t += 0.005
  pivots.forEach(({ pivot, speed }) => {
    pivot.rotation.y = t * speed
  })
})