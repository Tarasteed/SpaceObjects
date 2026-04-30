import * as THREE from 'three'
import { scene } from './scene.js'
const loader = new THREE.TextureLoader()
export function createPlanet({ radius, texturePath, position })
{
    const geo = new THREE.SphereGeometry(radius, 64, 64)
    const mat = new THREE.MeshStandardMaterial({ map: loader.load(texturePath), })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...position)
    scene.add(mesh)
    return mesh
} 

export function createSaturnRings(saturnMesh) { 
    const geo = new THREE.RingGeometry(1.4, 2.4, 64)
    const mat = new THREE.MeshBasicMaterial({ 
        map: loader.load('/textures/saturn_ring.png'),
        side: THREE.DoubleSide,
        transparent: true
    })
    const ring = new THREE.Mesh(geo, mat)
    ring.rotation.x = Math.PI / 2 - 0.3
    saturnMesh.add(ring)
} 

// Utilisation dans main.js : // const earth = createPlanet({ // radius: 0.5, // texturePath: '/textures/earth.jpg', // position: [5, 0, 0] // })