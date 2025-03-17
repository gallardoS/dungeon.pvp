/**
 * scene.js - Scene module for Dungeon PvP
 * Handles all Three.js scene, camera and renderer setup and management
 */

// Import THREE.js from centralized module
import { THREE } from './three-module.js';

// Import cursor module
import { applyCustomCursor } from './cursor.js';

// Import stats module
import { initStats, beginStats, endStats, setStatsVisibility } from './stats-module.js';

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

    // Create perspective camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 5);
    camera.lookAt(0, 0, 0);

    // Create WebGL renderer with antialiasing
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add event listener for window resize
    window.addEventListener('resize', onWindowResize, false);

    // Create ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Create directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x404040,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    scene.add(floor);

    // Apply custom cursor
    applyCustomCursor(renderer.domElement);
    
    // Initialize stats panels
    initStats();

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
    
    // Begin stats measurement
    beginStats();
    
    // Call the update callback if provided
    if (updateCallback) {
        updateCallback(scene, camera);
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // End stats measurement
    endStats();
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

/**
 * Toggle stats visibility
 * @param {boolean} visible - Whether stats should be visible
 */
function toggleStats(visible) {
    setStatsVisibility(visible);
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
    updateCameraPosition,
    toggleStats
};
