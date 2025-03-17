/**
 * player.js - Player module for Dungeon PvP
 * Handles player creation, movement and updates
 */

// Import modules
import { scene, camera, floorY } from './scene.js';
import { keys } from './input.js';
import { THREE } from './three-module.js';

// Player variables
let playerMesh = null;
let playerVelocity = new THREE.Vector3();
let playerOnGround = true;
let socket = null;

// Game settings
let settings = {
    moveSpeed: 0.1,
    jumpForce: 0.3,
    gravity: -0.015,
    mouseSensitivity: 0.002
};

/**
 * Set the socket instance for player communication
 * @param {Object} socketInstance - Socket.io instance
 */
function setSocket(socketInstance) {
    socket = socketInstance;
}

/**
 * Update game settings
 * @param {Object} newSettings - New settings object
 */
function updateGameSettings(newSettings) {
    settings = { ...settings, ...newSettings };
}

/**
 * Update player position and rotation
 */
function updatePlayer() {
    if (!playerMesh) return;
    
    // Update player movement based on key states
    const moveSpeed = settings.moveSpeed;
    
    // Reset velocity
    playerVelocity.x = 0;
    playerVelocity.z = 0;
    
    // Apply movement based on key states (topdown shooter style)
    if (keys.forward) {
        playerVelocity.z -= moveSpeed;
    }
    if (keys.backward) {
        playerVelocity.z += moveSpeed;
    }
    if (keys.left) {
        playerVelocity.x -= moveSpeed;
    }
    if (keys.right) {
        playerVelocity.x += moveSpeed;
    }
    
    // Apply jump if on ground
    if (keys.jump && playerOnGround) {
        playerVelocity.y = settings.jumpForce;
        playerOnGround = false;
    }
    
    // Apply gravity
    if (!playerOnGround) {
        playerVelocity.y += settings.gravity;
    }
    
    // Apply movement directly without rotation transformation (topdown shooter style)
    playerMesh.position.x += playerVelocity.x;
    playerMesh.position.y += playerVelocity.y;
    playerMesh.position.z += playerVelocity.z;
    
    // Check if player is on ground
    if (playerMesh.position.y <= floorY) {
        playerMesh.position.y = floorY;
        playerVelocity.y = 0;
        playerOnGround = true;
    }
    
    // Emit position update to server
    socket.volatile.emit('playerMove', {
        x: playerMesh.position.x,
        y: playerMesh.position.y,
        z: playerMesh.position.z
    });
    
    // Update camera position to follow player
    if (playerMesh) {
        const targetPosition = playerMesh.position;
        const offset = new THREE.Vector3(0, 21, 1);
        camera.position.copy(targetPosition).add(offset);
        camera.lookAt(targetPosition.clone().add(new THREE.Vector3(0, 0, 0)));
    }
    
    // Update name sprite rotation to always face camera
    const nameContainer = playerMesh.children.find(child => 
        child instanceof THREE.Object3D && 
        child.children.length > 0 && 
        child.children[0] instanceof THREE.Sprite
    );
    
    if (nameContainer) {
        nameContainer.rotation.y = -playerMesh.rotation.y;
    }
}

/**
 * Create a character mesh based on type
 * @param {string} type - Character type ('warrior' or 'mage')
 * @returns {THREE.Mesh} - Character mesh
 */
function createCharacterMesh(type) {
    const geometry = type === 'warrior' ? 
        new THREE.BoxGeometry(1, 2, 1) : 
        new THREE.ConeGeometry(0.5, 2, 32);
    geometry.translate(0, 1, 0); 
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = floorY;
    return mesh;
}

/**
 * Create a player name sprite
 * @param {string} name - Player name
 * @returns {THREE.Object3D} - Name sprite container
 */
function createPlayerName(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128; 
    context.font = '48px Metamorphous, serif';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.fillText(name, canvas.width/2, canvas.height/2 + 16); 
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 2;
    sprite.position.x = 0;
    sprite.position.z = -1;
    sprite.scale.set(3, 1.5, 1); 
    
    // Create a container for the sprite that will counter-rotate
    const container = new THREE.Object3D();
    container.add(sprite);
    
    return container;
}

/**
 * Create a directional triangle to show player direction
 * @returns {THREE.Mesh} - Directional triangle mesh
 */
function createDirectionalTriangle() {
    const geometry = new THREE.ConeGeometry(0.3, 1, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cone = new THREE.Mesh(geometry, material);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 1.0;
    cone.position.x = -0.5; 
    cone.position.y = 1.2;
    return cone;
}

/**
 * Get player mesh
 * @returns {THREE.Mesh} - Player mesh
 */
function getPlayerMesh() {
    return playerMesh;
}

/**
 * Create and set up the main player
 * @param {Object} playerData - Player data from server
 * @returns {THREE.Mesh} - Player mesh
 */
function createMainPlayer(playerData) {
    console.log('Creating main player with data:', playerData);
    
    // Create player mesh
    const mesh = createCharacterMesh(playerData.type);
    
    // Set position
    if (playerData.position) {
        mesh.position.set(
            playerData.position.x, 
            playerData.position.y, 
            playerData.position.z
        );
    }
    
    // Set rotation
    if (playerData.rotation !== undefined) {
        mesh.rotation.y = playerData.rotation;
    }
    
    // Add to scene
    scene.add(mesh);
    console.log('Main player mesh added to scene');
    
    // Add name sprite
    const nameSprite = createPlayerName(playerData.name);
    mesh.add(nameSprite);
    
    // Add directional indicator
    const directionalTriangle = createDirectionalTriangle();
    mesh.add(directionalTriangle);
    
    // Set as player mesh
    playerMesh = mesh;
    
    console.log('Main player created successfully');
    return mesh;
}

// Export player module
export {
    setSocket,
    updatePlayer,
    getPlayerMesh,
    createMainPlayer,
    updateGameSettings
};
