let scene, camera, renderer, socket;
let players = {};
let playerMesh;
let velocity = 0;
let isJumping = false;
let gravity = -0.015;
let moveSpeed = 0.1;
let jumpForce = 0.3;
const floorY = -4;
let playerRotation = 0;
let mouseSensitivity = 0.002;
let lastRotationUpdate = 0;

const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    ' ': false
};

let lastChatTime = Date.now();
let chatFadeTimer = null;
let isChatFocused = false;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);
    camera.lookAt(new THREE.Vector3(1, 2, 1));

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = floorY;
    scene.add(ground);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    renderer.domElement.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });

    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('focus', function() {
        isChatFocused = true;
    });
    
    messageInput.addEventListener('blur', function() {
        isChatFocused = false;
    });
    
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.addEventListener('mouseenter', function() {
        showChat();
    });
    
    chatContainer.addEventListener('mouseleave', function() {
        resetChatFadeTimer();
    });

    animate();
}

function handleMouseMove(event) {
    if (!playerMesh || isChatFocused) return;
    
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
                
                players[player.id] = {
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
                
                if (player.id === socket.id) {
                    playerMesh = mesh;
                    playerRotation = player.rotation || 0;
                
                    if (player.name === 'swami') {
                        document.getElementById('adminPanel').classList.remove('hidden');
                    }
                }
            } else if (player.id !== socket.id) {
                const existingPlayer = players[player.id];
                existingPlayer.targetPosition = { ...player.position };
                if (player.rotation !== undefined) {
                    existingPlayer.targetRotation = player.rotation;
                    existingPlayer.lastRotationUpdate = Date.now();
                }
                existingPlayer.lastUpdate = Date.now();
            }
        });

        Object.keys(players).forEach(id => {
            if (!playerList.find(p => p.id === id)) {
                scene.remove(players[id].mesh);
                delete players[id];
            }
        });

      
        if (playerMesh && players[socket.id] && players[socket.id].name === 'swami') {
            updateAdminPlayerList(playerList);
        }
    });

    socket.on('playerMoved', data => {
        if (players[data.id] && data.id !== socket.id) {
            const player = players[data.id];
            player.targetPosition = { ...data.position };
            player.lastUpdate = Date.now();
        }
    });
    
    socket.on('playerRotated', data => {
        if (players[data.id] && data.id !== socket.id) {
            const player = players[data.id];
            player.targetRotation = data.rotation;
            player.lastRotationUpdate = Date.now();
        }
    });

    socket.on('kicked', () => {
        alert('You have been kicked from the server');
        window.location.reload();
    });

    socket.on('chatMessage', data => {
        addChatMessage(data.sender, data.message, data.timestamp);
    });
}

function addChatMessage(sender, message, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const time = new Date(timestamp);
    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    messageElement.innerHTML = `
        <span class="sender">${sender}:</span>
        ${message}
        <span class="timestamp">${timeString}</span>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    while (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
    
    lastChatTime = Date.now();
    
    document.querySelectorAll('.chat-message').forEach(msg => {
        msg.classList.remove('fading');
    });
    
    const chatContainer = document.getElementById('chatContainer');
    const chatMessagesElement = document.getElementById('chatMessages');
    
    if (chatContainer) chatContainer.classList.remove('fading');
    if (chatMessagesElement) chatMessagesElement.classList.remove('fading');
    
    resetChatFadeTimer();
}

function resetChatFadeTimer() {
    if (chatFadeTimer) {
        clearTimeout(chatFadeTimer);
    }
    
    chatFadeTimer = setTimeout(() => {
        document.querySelectorAll('.chat-message').forEach(msg => {
            msg.classList.add('fading');
        });
        
        const chatContainer = document.getElementById('chatContainer');
        const chatMessages = document.getElementById('chatMessages');
        
        if (chatContainer) chatContainer.classList.add('fading');
        if (chatMessages) chatMessages.classList.add('fading');
    }, 5000);
}

function sendChatMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && socket) {
        socket.emit('chatMessage', { message });
        messageInput.value = '';
        
        resetChatFadeTimer();
    }
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
    if (isChatFocused && ['w', 'a', 's', 'd', ' '].includes(event.key.toLowerCase())) {
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

function updateMovement() {
    if (!playerMesh) return;
    
    if (isChatFocused) return;

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

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (playerMesh) {
        const playerPosition = playerMesh.position;
        const offset = new THREE.Vector3(0, 21, 1);
        camera.position.copy(playerPosition).add(offset);
        camera.lookAt(playerPosition.clone().add(new THREE.Vector3(0, 0, 0)));
    }
    
    updateMovement();
    applyPhysics();
    renderer.render(scene, camera);
}

function updateGameSettings(settings) {
    if (settings.moveSpeed !== undefined) moveSpeed = settings.moveSpeed;
    if (settings.jumpForce !== undefined) jumpForce = settings.jumpForce;
    if (settings.gravity !== undefined) gravity = settings.gravity;
    if (settings.mouseSensitivity !== undefined) mouseSensitivity = settings.mouseSensitivity;
}

function showChat() {
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatContainer) chatContainer.classList.remove('fading');
    if (chatMessages) chatMessages.classList.remove('fading');
    
    document.querySelectorAll('.chat-message').forEach(msg => {
        msg.classList.remove('fading');
    });
    
    resetChatFadeTimer();
}

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

window.updateGameSettings = updateGameSettings;
window.sendChatMessage = sendChatMessage;
