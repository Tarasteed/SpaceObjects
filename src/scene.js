import * as THREE from 'three' 
import { OrbitControls } from 'three/addons/controls/OrbitControls.js' 
// Renderer 
const canvas = document.getElementById('canvas') 
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }) 
renderer.setPixelRatio(window.devicePixelRatio) 
renderer.setSize(window.innerWidth, window.innerHeight) 
// Scène & caméra 
export const scene = new THREE.Scene() 
export const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 5000) 
camera.position.set(0, 8, 20)
// Contrôles orbite (rotation libre à la souris)
 export const controls = new OrbitControls(camera, canvas) 
 controls.enableDamping = true 
 controls.dampingFactor = 0.05 
 // Lumières 
 scene.add(new THREE.AmbientLight(0xffffff, 0.25))
 const sunLight = new THREE.PointLight(0xfffde0, 3, 400)
 scene.add(sunLight)
 // Resize 
 window.addEventListener('resize', () => { 
    camera.aspect = window.innerWidth / window.innerHeight 
    camera.updateProjectionMatrix() 
    renderer.setSize(window.innerWidth, window.innerHeight) 
})
 // Boucle d'animation 
 export function startLoop(onFrame) { 
    renderer.setAnimationLoop(() => { 
        controls.update() 
        onFrame() 
        renderer.render(scene, camera)
     }) 
}