/**
 * input.js - Input module for Dungeon PvP
 * Handles keyboard and mouse input
 */

// Import modules
import { camera, renderer, floorY } from './scene.js';
import { THREE } from './three-module.js';

// Key state tracking
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
};

// Variables for player control
let playerMesh = null;
let socket = null;
let lastRotationUpdate = 0;
let playerRotation = 0;
let isChatInputFocusedCallback = null;

/**
 * Handle keydown events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
    if (isChatInputFocusedCallback && isChatInputFocusedCallback()) return;
    
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = true;
            break;
        case 'Space':
            keys.jump = true;
            break;
    }
}

/**
 * Handle keyup events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyUp(event) {
    if (isChatInputFocusedCallback && isChatInputFocusedCallback()) return;
    
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            keys.right = false;
            break;
        case 'Space':
            keys.jump = false;
            break;
    }
}

/**
 * Handle mouse movement for player rotation
 * @param {MouseEvent} event - Mouse move event
 */
function handleMouseMove(event) {
    if (isChatInputFocusedCallback && isChatInputFocusedCallback()) return;
    
    if (playerMesh) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const ndcX = (mouseX / rect.width) * 2 - 1;
        const ndcY = -(mouseY / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, targetPoint);
        
        const dx = targetPoint.x - playerMesh.position.x;
        const dz = targetPoint.z - playerMesh.position.z;
        playerRotation = Math.atan2(dx, dz);
        
        // Update player mesh rotation
        playerMesh.rotation.y = playerRotation;
        
        const now = Date.now();
        if (now - lastRotationUpdate > 50) { 
            lastRotationUpdate = now;
            socket.volatile.emit('playerRotate', playerRotation);
        }
    }
}

/**
 * Set up input event listeners
 * @param {THREE.Mesh} mesh - Player mesh
 * @param {Object} socketInstance - Socket.io instance
 * @param {Function} isChatFocused - Function to check if chat input is focused
 */
function setupInput(mesh, socketInstance, isChatFocused) {
    playerMesh = mesh;
    socket = socketInstance;
    isChatInputFocusedCallback = isChatFocused;
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    
    console.log('Input event listeners initialized');
}

/**
 * Clean up input event listeners
 */
function cleanupInput() {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('mousemove', handleMouseMove);
    
    playerMesh = null;
    socket = null;
}

/**
 * Get the current player rotation
 * @returns {number} - Current player rotation
 */
function getPlayerRotation() {
    return playerRotation;
}

/**
 * Set the player mesh reference
 * @param {THREE.Mesh} mesh - Player mesh
 */
function setPlayerMesh(mesh) {
    playerMesh = mesh;
}

// Export input module
export {
    keys,
    setupInput,
    cleanupInput,
    getPlayerRotation,
    setPlayerMesh
};
