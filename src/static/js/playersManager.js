/**
 * playersManager.js - Players management module for Dungeon PvP
 * Handles creation, updating, removal and interpolation of other connected players
 */

// Import THREE.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

// Import scene variables
import { scene, floorY } from './scene.js';

// Connected players store
let players = {};
let socket;

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
 * Set the socket instance for player communication
 * @param {Object} socketInstance - Socket.io instance
 */
function setSocket(socketInstance) {
    socket = socketInstance;
}

/**
 * Add or update a player in the scene
 * @param {Object} playerData - Player data from server
 * @param {string} currentPlayerId - Current player's socket ID
 * @returns {Object} - Player object if added/updated, null if it's the current player
 */
function addOrUpdatePlayer(playerData, currentPlayerId) {
    console.log('addOrUpdatePlayer called for:', playerData.id, 'Current player:', currentPlayerId);
    
    // Skip if this is the current player
    if (playerData.id === currentPlayerId) {
        console.log('Skipping current player');
        return null;
    }
    
    // If player already exists, just update their target position and rotation
    if (players[playerData.id]) {
        console.log('Updating existing player:', playerData.id);
        const player = players[playerData.id];
        
        // Update position if provided
        if (playerData.position) {
            player.targetPosition = { ...playerData.position };
            player.lastUpdate = Date.now();
        }
        
        // Update rotation if provided
        if (playerData.rotation !== undefined) {
            player.targetRotation = playerData.rotation;
            player.lastRotationUpdate = Date.now();
        }
        
        return player;
    }
    
    console.log('Creating new player:', playerData.id, playerData.type);
    // Otherwise create a new player
    try {
        const mesh = createCharacterMesh(playerData.type);
        mesh.position.set(
            playerData.position.x, 
            playerData.position.y, 
            playerData.position.z
        );
        
        if (playerData.rotation !== undefined) {
            mesh.rotation.y = playerData.rotation;
        }
        
        scene.add(mesh);
        console.log('Added mesh to scene');
        
        // Add player name
        const nameSprite = createPlayerName(playerData.name);
        mesh.add(nameSprite);
        
        // Add directional indicator
        const directionalTriangle = createDirectionalTriangle();
        mesh.add(directionalTriangle);
        
        // Create player object
        const playerObj = {
            mesh: mesh,
            nameSprite: nameSprite,
            directionalTriangle: directionalTriangle,
            type: playerData.type,
            name: playerData.name,
            lastUpdate: Date.now(),
            targetPosition: { ...playerData.position },
            targetRotation: playerData.rotation || 0,
            lastRotationUpdate: Date.now()
        };
        
        // Store in players object
        players[playerData.id] = playerObj;
        console.log('Player added to players object:', playerData.id);
        
        return playerObj;
    } catch (error) {
        console.error('Error creating player:', error);
        return null;
    }
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
 * @param {string} currentPlayerId - Current player's socket ID
 */
function updatePlayerPosition(data, currentPlayerId) {
    if (players[data.id] && data.id !== currentPlayerId) {
        const player = players[data.id];
        player.targetPosition = { ...data.position };
        player.lastUpdate = Date.now();
    }
}

/**
 * Update player rotation
 * @param {Object} data - Player rotation data
 * @param {string} currentPlayerId - Current player's socket ID
 */
function updatePlayerRotation(data, currentPlayerId) {
    if (players[data.id] && data.id !== currentPlayerId) {
        const player = players[data.id];
        player.targetRotation = data.rotation;
        player.lastRotationUpdate = Date.now();
    }
}

/**
 * Process a list of players from the server
 * @param {Array} playerList - List of players from server
 * @param {string} currentPlayerId - Current player's socket ID
 * @returns {Array} - Array of added/updated players
 */
function processPlayerList(playerList, currentPlayerId) {
    console.log('Processing players:', playerList);
    console.log('Current player ID:', currentPlayerId);
    
    const updatedPlayers = [];
    
    // Add or update players
    playerList.forEach(player => {
        console.log('Processing player:', player.id, player.name, player.type);
        if (player.id !== currentPlayerId) {
            const result = addOrUpdatePlayer(player, currentPlayerId);
            if (result) {
                console.log('Player added/updated:', player.id);
                updatedPlayers.push(result);
            } else {
                console.log('Player skipped or error occurred:', player.id);
            }
        } else {
            console.log('Skipping current player in processPlayerList:', player.id);
        }
    });
    
    // Remove players that are no longer in the list
    Object.keys(players).forEach(id => {
        if (!playerList.find(p => p.id === id)) {
            console.log('Removing player:', id);
            removePlayer(id);
        }
    });
    
    console.log('Total players after processing:', Object.keys(players).length);
    return updatedPlayers;
}

/**
 * Interpolate player positions and rotations for smooth movement
 */
function interpolatePlayerPositions() {
    console.log('Interpolating positions for', Object.keys(players).length, 'players');
    
    Object.values(players).forEach(player => {
        // Position interpolation
        if (player.targetPosition) {
            const t = Math.min((Date.now() - player.lastUpdate) / 100, 1);
            player.mesh.position.x += (player.targetPosition.x - player.mesh.position.x) * t;
            player.mesh.position.y += (player.targetPosition.y - player.mesh.position.y) * t;
            player.mesh.position.z += (player.targetPosition.z - player.mesh.position.z) * t;
        }
        
        // Rotation interpolation
        if (player.targetRotation !== undefined) {
            const t = Math.min((Date.now() - player.lastRotationUpdate) / 50, 1);
            const currentRotation = player.mesh.rotation.y;
            let targetRotation = player.targetRotation;
            
            // Handle rotation wrapping for shortest path
            const diff = targetRotation - currentRotation;
            if (diff > Math.PI) targetRotation -= Math.PI * 2;
            if (diff < -Math.PI) targetRotation += Math.PI * 2;
            
            player.mesh.rotation.y += (targetRotation - player.mesh.rotation.y) * (t * 1.5);
        }
        
        // Keep player names facing the camera
        if (player.nameSprite) {
            player.nameSprite.rotation.y = -player.mesh.rotation.y;
        }
    });
}

/**
 * Get all players
 * @returns {Object} - All players
 */
function getPlayers() {
    return players;
}

/**
 * Check if a player exists
 * @param {string} playerId - Player ID to check
 * @returns {boolean} - True if player exists
 */
function hasPlayer(playerId) {
    return players[playerId] !== undefined;
}

/**
 * Get a specific player
 * @param {string} playerId - Player ID to get
 * @returns {Object} - Player object or undefined
 */
function getPlayer(playerId) {
    return players[playerId];
}

/**
 * Clear all players
 */
function clearPlayers() {
    Object.keys(players).forEach(id => {
        removePlayer(id);
    });
}

// Export players manager module functions
export {
    setSocket,
    addOrUpdatePlayer,
    removePlayer,
    updatePlayerPosition,
    updatePlayerRotation,
    processPlayerList,
    interpolatePlayerPositions,
    getPlayers,
    hasPlayer,
    getPlayer,
    clearPlayers
};
