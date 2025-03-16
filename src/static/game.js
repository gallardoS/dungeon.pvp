// Import chat module
import { initChat, addChatMessage, sendChatMessage, isChatInputFocused } from './js/chat.js';
// Import scene module
import { scene, camera, renderer, floorY, initScene, animate } from './js/scene.js';
// Import player module
import { 
    initPlayerControls, 
    updatePlayer, 
    setSocket, 
    addPlayer, 
    removePlayer, 
    updatePlayerPosition, 
    updatePlayerRotation,
    getPlayerMesh,
    getPlayers,
    updateGameSettings as updatePlayerSettings
} from './js/player.js';

let socket;
let players = {};

function init() {
    // Initialize scene, camera and renderer
    initScene();
    
    // Initialize player controls
    initPlayerControls(isChatInputFocused);
    
    // Start the animation loop with our update function
    animate(updateGame);
}

function updateGame() {
    // Update player position, physics, and camera
    updatePlayer(isChatInputFocused);
}

function initSocket() {
    socket = io({
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
        document.getElementById('debug').textContent = 'Connected';
    });

    socket.on('disconnect', () => {
        document.getElementById('debug').textContent = 'Disconnected';
    });

    socket.on('players', playerList => {
        playerList.forEach(player => {
            if (!players[player.id]) {
                // Add new player
                addPlayer(player, socket.id);
                
                // Show admin panel if player is admin
                if (player.id === socket.id && player.name === 'swami') {
                    document.getElementById('adminPanel').classList.remove('hidden');
                }
            } else if (player.id !== socket.id) {
                // Update existing player
                const playerData = {
                    id: player.id,
                    position: player.position
                };
                updatePlayerPosition(playerData);
                
                if (player.rotation !== undefined) {
                    const rotationData = {
                        id: player.id,
                        rotation: player.rotation
                    };
                    updatePlayerRotation(rotationData);
                }
            }
        });

        // Remove players that are no longer in the list
        Object.keys(players).forEach(id => {
            if (!playerList.find(p => p.id === id)) {
                removePlayer(id);
            }
        });

        // Update admin player list if player is admin
        const playersList = getPlayers();
        if (playersList[socket.id] && playersList[socket.id].name === 'swami') {
            updateAdminPlayerList(playerList);
        }
    });

    socket.on('playerMoved', data => {
        updatePlayerPosition(data);
    });
    
    socket.on('playerRotated', data => {
        updatePlayerRotation(data);
    });

    socket.on('kicked', () => {
        alert('You have been kicked from the server');
        window.location.reload();
    });

    // Initialize chat module with socket instance
    initChat(socket);
    setSocket(socket);
}

function updateAdminPlayerList(playerList) {
    const playerListElement = document.getElementById('connectedPlayers');
    playerListElement.innerHTML = '';
    
    playerList.forEach(player => {
        if (player.id !== socket.id) {
            const li = document.createElement('li');
            li.className = 'player-item';
            li.innerHTML = `
                <span>${player.name} (${player.type})</span>
                <button class="kick-button" onclick="kickPlayer('${player.id}')">Kick</button>
            `;
            playerListElement.appendChild(li);
        }
    });
}

function kickPlayer(playerId) {
    socket.emit('kickPlayer', { id: playerId });
}

function handleKeyDown(event) {
    if (isChatInputFocused() && ['w', 'a', 's', 'd', ' '].includes(event.key.toLowerCase())) {
        return;
    }
    
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = true;
    }
}

function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    if (key in keys) {
        keys[key] = false;
    }
}

function updateGameSettings(settings) {
    // Pass settings to player module
    updatePlayerSettings(settings);
}

// Export functions for use in HTML
window.updateGameSettings = updateGameSettings;
window.sendChatMessage = sendChatMessage;
window.init = init;
window.initSocket = initSocket;
window.selectCharacter = function(type) {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('debugToggle').classList.remove('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
    window.playerType = type;
    socket.emit('playerSelect', {
        name: window.playerName,
        type: type
    });
    
    // Add event listeners for chat buttons
    document.getElementById('sendButton').addEventListener('click', sendChatMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Add event listener for debug toggle
    document.getElementById('debugToggle').addEventListener('click', toggleDebugPanel);
}

// Add toggleDebugPanel function
function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('collapsed');
    }
}

// Initialize the game when the module is loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    initSocket();
});
