/**
 * player.js - Player module for Dungeon PvP
 * Handles player creation, movement, physics and controls
 */

// Import scene variables
import { scene, camera, renderer, floorY, updateCameraPosition } from './scene.js';

// Player state variables
let playerMesh;
let velocity = 0;
let isJumping = false;
let gravity = -0.015;
let moveSpeed = 0.1;
let jumpForce = 0.3;
let playerRotation = 0;
let mouseSensitivity = 0.002;
let lastRotationUpdate = 0;
let socket;

// Keyboard state
const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    ' ': false
};

/**
 * Initialize player controls
 * @param {Function} isChatInputFocused - Function to check if chat input is focused
 */
function initPlayerControls(isChatInputFocused) {
    // Set up event listeners for player controls
    document.addEventListener('keydown', (event) => handleKeyDown(event, isChatInputFocused));
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', (event) => handleMouseMove(event, isChatInputFocused));
}

/**
 * Handle mouse movement for player rotation
 * @param {Event} event - Mouse move event
 * @param {Function} isChatInputFocused - Function to check if chat input is focused
 */
function handleMouseMove(event, isChatInputFocused) {
    if (isChatInputFocused()) return;
    
    if (playerMesh) {
        // Usar el método de raycasting para determinar la dirección de rotación
        const rect = renderer.domElement.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Convertir posición del mouse a coordenadas normalizadas (-1 a +1)
        const ndcX = (mouseX / rect.width) * 2 - 1;
        const ndcY = -(mouseY / rect.height) * 2 + 1;
        
        // Crear un rayo desde la cámara a través de la posición del mouse
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        
        // Obtener el punto donde el rayo intersecta con el plano del suelo
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, targetPoint);
        
        // Calcular el ángulo entre la posición del jugador y el punto objetivo
        const dx = targetPoint.x - playerMesh.position.x;
        const dz = targetPoint.z - playerMesh.position.z;
        playerRotation = Math.atan2(dx, dz);
        
        // Emitir actualización de rotación al servidor (limitada)
        const now = Date.now();
        if (now - lastRotationUpdate > 50) { // Limitar a 20 actualizaciones por segundo
            lastRotationUpdate = now;
            socket.volatile.emit('playerRotate', playerRotation);
        }
    }
}

/**
 * Handle key down events
 * @param {Event} event - Key event
 * @param {Function} isChatInputFocused - Function to check if chat input is focused
 */
function handleKeyDown(event, isChatInputFocused) {
    if (isChatInputFocused() && ['w', 'a', 's', 'd', ' '].includes(event.key.toLowerCase())) {
        return;
    }
    
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = true;
    }
}

/**
 * Handle key up events
 * @param {Event} event - Key event
 */
function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;
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
 * Update player movement based on keyboard input
 * @param {Function} isChatInputFocused - Function to check if chat input is focused
 */
function updateMovement(isChatInputFocused) {
    if (!playerMesh) return;
    
    if (isChatInputFocused()) return;

    let moved = false;
    const movement = { x: 0, z: 0 };
    
    if (keys.w) {
        movement.z = -moveSpeed; // Move north
    }
    if (keys.s) {
        movement.z = moveSpeed;  // Move south
    }
    if (keys.a) {
        movement.x = -moveSpeed; // Move west
    }
    if (keys.d) {
        movement.x = moveSpeed;  // Move east
    }
    
    if (movement.x !== 0 || movement.z !== 0) {
        // Apply movement directly without rotation transformation
        playerMesh.position.x = Math.max(Math.min(playerMesh.position.x + movement.x, 10), -10);
        playerMesh.position.z = Math.max(Math.min(playerMesh.position.z + movement.z, 10), -10);
        moved = true;
    }

    if (keys[' '] && !isJumping) {
        velocity = jumpForce;
        isJumping = true;
        moved = true;
    }

    // Update rotation to face mouse cursor
    playerMesh.rotation.y = playerRotation;
    
    if (moved) {
        socket.volatile.emit('playerMove', {
            x: playerMesh.position.x,
            y: playerMesh.position.y,
            z: playerMesh.position.z
        });
    }
}

/**
 * Apply physics to the player (gravity, jumping)
 */
function applyPhysics() {
    if (playerMesh) {
        if (playerMesh.position.y > floorY) {
            velocity += gravity;
            playerMesh.position.y += velocity;
            if (playerMesh.position.y < floorY) {
                playerMesh.position.y = floorY;
                velocity = 0;
                isJumping = false;
            }
            socket.emit('playerMove', {
                x: playerMesh.position.x,
                y: playerMesh.position.y,
                z: playerMesh.position.z
            });
        }
    }
}

/**
 * Update game settings
 * @param {Object} settings - Game settings to update
 */
function updateGameSettings(settings) {
    if (settings.moveSpeed !== undefined) moveSpeed = settings.moveSpeed;
    if (settings.jumpForce !== undefined) jumpForce = settings.jumpForce;
    if (settings.gravity !== undefined) gravity = settings.gravity;
    if (settings.mouseSensitivity !== undefined) mouseSensitivity = settings.mouseSensitivity;
}

/**
 * Set the socket instance for player communication
 * @param {Object} socketInstance - Socket.io instance
 */
function setSocket(socketInstance) {
    socket = socketInstance;
}

/**
 * Get the current player mesh
 * @returns {THREE.Mesh} - Current player mesh
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
        playerRotation = playerData.rotation;
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

/**
 * Update player in game loop
 * @param {Function} isChatInputFocused - Function to check if chat input is focused
 */
function updatePlayer(isChatInputFocused) {
    updateMovement(isChatInputFocused);
    applyPhysics();
    
    if (playerMesh) {
        updateCameraPosition(playerMesh);
        
        // Update name sprite rotation to always face camera
        const nameContainer = playerMesh.children.find(child => child instanceof THREE.Object3D && child.children.length > 0 && child.children[0] instanceof THREE.Sprite);
        if (nameContainer) {
            nameContainer.rotation.y = -playerMesh.rotation.y;
        }
    }
}

// Export player module functions
export {
    initPlayerControls,
    createCharacterMesh,
    createPlayerName,
    createDirectionalTriangle,
    updateMovement,
    applyPhysics,
    updateGameSettings,
    setSocket,
    getPlayerMesh,
    createMainPlayer,
    updatePlayer
};
