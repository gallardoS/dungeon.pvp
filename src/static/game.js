import { initChat, addChatMessage, sendChatMessage, isChatInputFocused } from './js/chat.js';
import { scene, camera, renderer, floorY, initScene, animate } from './js/scene.js';
import { 
    updatePlayer, 
    setSocket as setPlayerSocket, 
    getPlayerMesh,
    createMainPlayer,
    updateGameSettings as updatePlayerSettings
} from './js/player.js';
import {
    setSocket as setPlayersManagerSocket,
    processPlayerList,
    interpolatePlayerPositions,
    updatePlayerPosition,
    updatePlayerRotation,
    getPlayers,
    hasPlayer
} from './js/playersManager.js';
import {
    keys,
    setupInput,
    cleanupInput,
    setPlayerMesh
} from './js/input.js';

let socket;

function init() {
    initScene();
    
    initSocket();
    
    animate(updateGame);
}

function updateGame() {
    updatePlayer();
    
    interpolatePlayerPositions();
}

function initSocket() {
    socket = io();

    setPlayerSocket(socket);
    setPlayersManagerSocket(socket);
    
    socket.on('connect', () => {
        document.getElementById('debug').textContent = 'Connection status: Connected';
        
        initChat(socket);
    });
    
    socket.on('disconnect', () => {
        document.getElementById('debug').textContent = 'Connection status: Disconnected';
    });

    socket.on('players', playerList => {
        console.log('Received player list:', playerList);
        
        const currentPlayer = playerList.find(p => p.id === socket.id);
        if (currentPlayer) {
            console.log('Found current player in list:', currentPlayer);
            
            if (!getPlayerMesh()) {
                console.log('Creating main player');
                const playerMesh = createMainPlayer(currentPlayer);
                
                setupInput(playerMesh, socket, isChatInputFocused);
            }
            
            if (currentPlayer.name === 'swami') {
                document.getElementById('adminPanel').classList.remove('hidden');
                updateAdminPlayerList(playerList);
            }
        }
        
        processPlayerList(playerList, socket.id);
    });

    socket.on('playerMoved', data => {
        updatePlayerPosition(data, socket.id);
    });
    
    socket.on('playerRotated', data => {
        updatePlayerRotation(data, socket.id);
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

window.updateGameSettings = updateGameSettings;
window.sendChatMessage = sendChatMessage;
window.init = init;

window.selectCharacter = function(type) {
    document.getElementById('ui').classList.add('hidden');
    document.getElementById('debugToggle').classList.remove('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
    window.playerType = type;
    
    socket.emit('playerSelect', {
        name: window.playerName,
        type: type
    });
    
    document.getElementById('sendButton').addEventListener('click', sendChatMessage);
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
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

document.addEventListener('DOMContentLoaded', () => {
    init();
});
