let scene, camera, renderer, socket;
let players = {};
let playerMesh;
let velocity = 0;
let isJumping = false;
let gravity = -0.015;
let moveSpeed = 0.1;
let jumpForce = 0.3;
const floorY = -4;
let lastMouseX = 0;
let playerRotation = 0;
let mouseSensitivity = 0.002;
let isRotating = false;

const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    ' ': false
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

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
    
    // Eventos para controlar la rotación con el ratón sin bloquearlo
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Prevenir el menú contextual al hacer clic derecho
    renderer.domElement.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });

    animate();
}

function handleMouseDown(event) {
    // Solo activar la rotación con el botón derecho (event.button === 2)
    if (event.button === 2) {
        isRotating = true;
        lastMouseX = event.clientX;
    }
}

function handleMouseUp(event) {
    // Solo desactivar la rotación si se suelta el botón derecho
    if (event.button === 2) {
        isRotating = false;
    }
}

function handleMouseMove(event) {
    if (isRotating) {
        // Calcular el movimiento horizontal del ratón
        const deltaX = event.clientX - lastMouseX;
        playerRotation -= deltaX * mouseSensitivity;
        lastMouseX = event.clientX;
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
    canvas.height = 64;
    context.font = '32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(name, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 3; 
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
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
                scene.add(mesh);
                
                const nameSprite = createPlayerName(player.name);
                mesh.add(nameSprite);
                
                players[player.id] = {
                    mesh: mesh,
                    nameSprite: nameSprite,
                    type: player.type,
                    name: player.name,
                    lastUpdate: Date.now(),
                    targetPosition: { ...player.position }
                };
                
                if (player.id === socket.id) {
                    playerMesh = mesh;
                
                    if (player.name === 'swami') {
                        document.getElementById('adminPanel').classList.remove('hidden');
                    }
                }
            } else if (player.id !== socket.id) {
                const existingPlayer = players[player.id];
                existingPlayer.targetPosition = { ...player.position };
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
    
    // Limitar el número de mensajes (mantener los últimos 50)
    while (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

function sendChatMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && socket) {
        socket.emit('chatMessage', { message });
        messageInput.value = '';
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

    let moved = false;
    const movement = { x: 0, z: 0 };
    
    // Crear un vector de dirección basado en la rotación del personaje
    const direction = new THREE.Vector3();
    
    // Movimiento relativo a la dirección del personaje
    if (keys.w) {
        direction.z = -1;
    }
    if (keys.s) {
        direction.z = 1;
    }
    if (keys.a) {
        direction.x = -1;
    }
    if (keys.d) {
        direction.x = 1;
    }
    
    // Normalizar el vector si se mueve en diagonal
    if (direction.length() > 0) {
        direction.normalize();
        
        // Aplicar la rotación del personaje al movimiento
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
        
        movement.x = direction.x * moveSpeed;
        movement.z = direction.z * moveSpeed;
        moved = true;
    }

    if (keys[' '] && !isJumping) {
        velocity = jumpForce;
        isJumping = true;
        moved = true;
    }

    if (movement.x !== 0 || movement.z !== 0) {
        playerMesh.position.x = Math.max(Math.min(playerMesh.position.x + movement.x, 10), -10);
        playerMesh.position.z = Math.max(Math.min(playerMesh.position.z + movement.z, 10), -10);
        moved = true;
    }
    
    // Actualizar la rotación del personaje
    playerMesh.rotation.y = playerRotation;

    if (moved) {
        socket.volatile.emit('playerMove', {
            x: playerMesh.position.x,
            y: playerMesh.position.y,
            z: playerMesh.position.z
        });
    }

    Object.values(players).forEach(player => {
        if (player.mesh !== playerMesh && player.targetPosition) {
            const t = Math.min((Date.now() - player.lastUpdate) / 100, 1);
            player.mesh.position.x += (player.targetPosition.x - player.mesh.position.x) * t;
            player.mesh.position.y += (player.targetPosition.y - player.mesh.position.y) * t;
            player.mesh.position.z += (player.targetPosition.z - player.mesh.position.z) * t;
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
    updateMovement();
    applyPhysics();
    
    if (playerMesh) {
        // Posicionar la cámara detrás del personaje basado en su rotación
        const cameraOffset = new THREE.Vector3(0, 3, 5);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation);
        
        camera.position.x = playerMesh.position.x + cameraOffset.x;
        camera.position.y = playerMesh.position.y + cameraOffset.y;
        camera.position.z = playerMesh.position.z + cameraOffset.z;
        
        // Hacer que la cámara mire al personaje
        camera.lookAt(
            playerMesh.position.x,
            playerMesh.position.y + 1, // Mirar un poco por encima del centro del jugador
            playerMesh.position.z
        );
       
        document.getElementById('playerPosition').textContent = 
            `x: ${playerMesh.position.x.toFixed(2)}, y: ${playerMesh.position.y.toFixed(2)}, z: ${playerMesh.position.z.toFixed(2)}`;
        document.getElementById('playerJumping').textContent = isJumping;
        document.getElementById('playerRotation').textContent = 
            `${(playerRotation * 180 / Math.PI).toFixed(2)}°`;
    }

    Object.values(players).forEach(player => {
        if (player.nameSprite) {
            player.nameSprite.lookAt(camera.position);
        }
    });

    renderer.render(scene, camera);
}

function updateGameSettings(settings) {
    if (settings.moveSpeed !== undefined) moveSpeed = settings.moveSpeed;
    if (settings.jumpForce !== undefined) jumpForce = settings.jumpForce;
    if (settings.gravity !== undefined) gravity = settings.gravity;
    if (settings.mouseSensitivity !== undefined) mouseSensitivity = settings.mouseSensitivity;
}

window.updateGameSettings = updateGameSettings;
window.sendChatMessage = sendChatMessage;
