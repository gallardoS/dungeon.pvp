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
let players = {};
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
 * @param {Event} event - Mouse event
 * @param {Function} isChatInputFocused - Function to check if chat input is focused
 */
function handleMouseMove(event, isChatInputFocused) {
    if (!playerMesh || isChatInputFocused()) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Convert mouse position to normalized device coordinates (-1 to +1)
    const ndcX = (mouseX / rect.width) * 2 - 1;
    const ndcY = -(mouseY / rect.height) * 2 + 1;
    
    // Create a ray from the camera through the mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    
    // Get the point where the ray intersects the ground plane
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, targetPoint);
    
    // Calculate the angle between player position and target point
    const dx = targetPoint.x - playerMesh.position.x;
    const dz = targetPoint.z - playerMesh.position.z;
    playerRotation = Math.atan2(dx, dz);
    
    const now = Date.now();
    if (now - lastRotationUpdate > 30) {
        socket.emit('playerRotate', playerRotation);
        lastRotationUpdate = now;
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
    
    // Counter-rotate the name container to keep it facing north
    Object.values(players).forEach(player => {
        if (player.nameSprite) {
            player.nameSprite.rotation.y = -player.mesh.rotation.y;
        }
    });

    if (moved) {
        socket.volatile.emit('playerMove', {
            x: playerMesh.position.x,
            y: playerMesh.position.y,
            z: playerMesh.position.z
        });
    }

    // Update other players' positions and rotations
    Object.values(players).forEach(player => {
        if (player.mesh !== playerMesh) {
            if (player.targetPosition) {
                const t = Math.min((Date.now() - player.lastUpdate) / 100, 1);
                player.mesh.position.x += (player.targetPosition.x - player.mesh.position.x) * t;
                player.mesh.position.y += (player.targetPosition.y - player.mesh.position.y) * t;
                player.mesh.position.z += (player.targetPosition.z - player.mesh.position.z) * t;
            }
            
            if (player.targetRotation !== undefined) {
                const t = Math.min((Date.now() - player.lastRotationUpdate) / 50, 1);
                const currentRotation = player.mesh.rotation.y;
                let targetRotation = player.targetRotation;
                
                const diff = targetRotation - currentRotation;
                if (diff > Math.PI) targetRotation -= Math.PI * 2;
                if (diff < -Math.PI) targetRotation += Math.PI * 2;
                
                player.mesh.rotation.y += (targetRotation - player.mesh.rotation.y) * (t * 1.5);
            }
        }
    });
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
 * Add a player to the scene
 * @param {Object} player - Player data
 * @param {string} socketId - Current player's socket ID
 * @returns {Object} - Player object with mesh and other properties
 */
function addPlayer(player, socketId) {
    const mesh = createCharacterMesh(player.type);
    mesh.position.set(player.position.x, player.position.y, player.position.z);
    if (player.rotation !== undefined) {
        mesh.rotation.y = player.rotation;
    }
    scene.add(mesh);
    
    const nameSprite = createPlayerName(player.name);
    mesh.add(nameSprite);
    
    const directionalTriangle = createDirectionalTriangle();
    mesh.add(directionalTriangle);
    
    const playerObj = {
        mesh: mesh,
        nameSprite: nameSprite,
        directionalTriangle: directionalTriangle,
        type: player.type,
        name: player.name,
        lastUpdate: Date.now(),
        targetPosition: { ...player.position },
        targetRotation: player.rotation || 0,
        lastRotationUpdate: Date.now()
    };
    
    players[player.id] = playerObj;
    
    if (player.id === socketId) {
        playerMesh = mesh;
        playerRotation = player.rotation || 0;
    }
    
    return playerObj;
}

/**
 * Remove a player from the scene
 * @param {string} playerId - Player ID to remove
 */
function removePlayer(playerId) {
    if (players[playerId]) {
        scene.remove(players[playerId].mesh);
        delete players[playerId];
    }
}

/**
 * Update player position
 * @param {Object} data - Player position data
 */
function updatePlayerPosition(data) {
    if (players[data.id] && data.id !== socket.id) {
        const player = players[data.id];
        player.targetPosition = { ...data.position };
        player.lastUpdate = Date.now();
    }
}

/**
 * Update player rotation
 * @param {Object} data - Player rotation data
 */
function updatePlayerRotation(data) {
    if (players[data.id] && data.id !== socket.id) {
        const player = players[data.id];
        player.targetRotation = data.rotation;
        player.lastRotationUpdate = Date.now();
    }
}

/**
 * Get the current player mesh
 * @returns {THREE.Mesh} - Current player mesh
 */
function getPlayerMesh() {
    return playerMesh;
}

/**
 * Get all players
 * @returns {Object} - All players
 */
function getPlayers() {
    return players;
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
    addPlayer,
    removePlayer,
    updatePlayerPosition,
    updatePlayerRotation,
    getPlayerMesh,
    getPlayers,
    updatePlayer
};
