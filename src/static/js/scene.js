/**
 * scene.js - Scene module for Dungeon PvP
 * Handles all Three.js scene, camera and renderer setup and management
 */

// Import cursor module
import { applyCustomCursor } from './cursor.js';

// Scene variables
let scene, camera, renderer;
const floorY = -4;

/**
 * Initialize the scene, camera and renderer
 * @returns {Object} Object containing scene, camera, and renderer
 */
function initScene() {
    // Create scene with gray background (as per user preference)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);

    // Set up camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);
    camera.lookAt(new THREE.Vector3(1, 2, 1));

    // Set up renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Apply custom cursor to renderer
    applyCustomCursor(renderer.domElement);

    // Create ground plane with black color (as per user preference)
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = floorY;
    scene.add(ground);

    // Set up window resize handler
    window.addEventListener('resize', onWindowResize, false);
    
    return { scene, camera, renderer };
}

/**
 * Handle window resize events
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Animation loop function
 * @param {Function} updateCallback - Function to call for game updates
 */
function animate(updateCallback) {
    requestAnimationFrame(() => animate(updateCallback));
    
    // Call the update callback if provided
    if (updateCallback) {
        updateCallback(scene, camera);
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

/**
 * Update camera position to follow a target
 * @param {THREE.Object3D} target - The target to follow
 */
function updateCameraPosition(target) {
    if (target) {
        const targetPosition = target.position;
        const offset = new THREE.Vector3(0, 21, 1);
        camera.position.copy(targetPosition).add(offset);
        camera.lookAt(targetPosition.clone().add(new THREE.Vector3(0, 0, 0)));
    }
}

// Export scene module
export {
    scene,
    camera,
    renderer,
    floorY,
    initScene,
    onWindowResize,
    animate,
    updateCameraPosition
};
