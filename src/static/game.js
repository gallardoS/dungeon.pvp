// Import chat module
import { initChat, addChatMessage, sendChatMessage, isChatInputFocused } from './js/chat.js';
// Import scene module
import { scene, camera, renderer, floorY, initScene, animate } from './js/scene.js';
// Import player module
import { 
    updatePlayer, 
    setSocket as setPlayerSocket, 
    getPlayerMesh,
    createMainPlayer,
    updateGameSettings as updatePlayerSettings
} from './js/player.js';
// Import players manager module
import {
    setSocket as setPlayersManagerSocket,
    processPlayerList,
    interpolatePlayerPositions,
    updatePlayerPosition,
    updatePlayerRotation,
    getPlayers,
    hasPlayer
} from './js/playersManager.js';
// Import input module
import {
    keys,
    setupInput,
    cleanupInput,
    setPlayerMesh
} from './js/input.js';

let socket;

function init() {
    // Initialize scene, camera and renderer
    initScene();
    
    // Initialize socket connection
    initSocket();
    
    // Start the animation loop with our update function
    animate(updateGame);
}

function updateGame() {
    // Update player position and rotation
    updatePlayer();
    
    // Interpolate other players' positions
    interpolatePlayerPositions();
}

function initSocket() {
    socket = io();
    
    // Set socket in player and players manager modules
    setPlayerSocket(socket);
    setPlayersManagerSocket(socket);
    
    // Socket connection event
    socket.on('connect', () => {
        document.getElementById('debug').textContent = 'Connection status: Connected';
        
        // Initialize chat
        initChat(socket, addChatMessage);
    });
    
    // Socket disconnection event
    socket.on('disconnect', () => {
        document.getElementById('debug').textContent = 'Connection status: Disconnected';
    });

    socket.on('players', playerList => {
        console.log('Received player list:', playerList);
        
        // Check for current player and create/update if needed
        const currentPlayer = playerList.find(p => p.id === socket.id);
        if (currentPlayer) {
            console.log('Found current player in list:', currentPlayer);
            
            // Check if we need to create the main player
            if (!getPlayerMesh()) {
                console.log('Creating main player');
                const playerMesh = createMainPlayer(currentPlayer);
                
                // Initialize input controls with the player mesh
                setupInput(playerMesh, socket, isChatInputFocused);
            }
            
            // Show admin panel if player is admin
            if (currentPlayer.name === 'swami') {
                document.getElementById('adminPanel').classList.remove('hidden');
                updateAdminPlayerList(playerList);
            }
        }
        
        // Process all other players
        processPlayerList(playerList, socket.id);
    });

    socket.on('playerMoved', data => {
        console.log('Player moved:', data.id);
        updatePlayerPosition(data, socket.id);
    });
    
    socket.on('playerRotated', data => {
        console.log('Player rotated:', data.id);
        updatePlayerRotation(data, socket.id);
    });
    
    socket.on('chatMessage', data => {
        addChatMessage(data);
    });
    
    socket.on('playerDisconnected', playerId => {
        console.log('Player disconnected:', playerId);
    });
    
    socket.on('kicked', () => {
        alert('You have been kicked from the server');
        window.location.reload();
    });
}

function updateAdminPlayerList(playerList) {
    const playerListElement = document.getElementById('connectedPlayers');
    playerListElement.innerHTML = '';
    
    playerList.forEach(player => {
        const playerItem = document.createElement('li');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span>${player.name} (${player.type})</span>
            <button class="kick-button" data-player-id="${player.id}">Kick</button>
        `;
        playerListElement.appendChild(playerItem);
    });
    
    // Agregar event listeners a los botones de kick
    document.querySelectorAll('.kick-button').forEach(button => {
        button.addEventListener('click', function() {
            const playerId = this.getAttribute('data-player-id');
            kickPlayer(playerId);
        });
    });
}

function kickPlayer(playerId) {
    socket.emit('kickPlayer', { id: playerId });
}

function updateGameSettings(settings) {
    updatePlayerSettings(settings);
}

// Export functions for use in HTML
window.updateGameSettings = updateGameSettings;
window.sendChatMessage = sendChatMessage;
window.init = init;

window.selectCharacter = function(type) {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('debugToggle').classList.remove('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
    window.playerType = type;
    
    // Emit player selection to server
    socket.emit('playerSelect', {
        name: window.playerName,
        type: type
    });
    
    // Create main player with initial data
    // Note: We don't create the player here anymore, we'll wait for the server to send it back
    // This ensures consistency between client and server
    
    // Add event listeners for chat buttons
    document.getElementById('sendButton').addEventListener('click', sendChatMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Add event listener for debug toggle
    document.getElementById('debugToggle').addEventListener('click', toggleDebugPanel);
};

window.kickPlayer = kickPlayer;

function toggleDebugPanel() {
    const debugPanel = document.getElementById('debugPanel');
    debugPanel.classList.toggle('hidden');
    debugPanel.classList.toggle('collapsed');
}

window.validateName = function() {
    const name = document.getElementById('playerName').value.trim();
    const errorElement = document.getElementById('nameError');
    
    if (name.length < 3) {
        errorElement.textContent = 'Name must be at least 3 characters';
        return false;
    } else if (name.length > 15) {
        errorElement.textContent = 'Name must be at most 15 characters';
        return false;
    } else {
        errorElement.textContent = '';
        window.playerName = name;
        document.getElementById('nameForm').classList.add('hidden');
        document.getElementById('characterSelect').classList.remove('hidden');
        return true;
    }
};

// Initialize the game when the module is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
});
