let scene, camera, renderer, socket;
let players = {};
let playerMesh;
let velocity = 0;
let isJumping = false;
let gravity = -0.015;
let moveSpeed = 0.1;
let jumpForce = 0.3;
const floorY = -4;

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

    animate();
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

    if (keys.w) movement.z -= moveSpeed;
    if (keys.s) movement.z += moveSpeed;
    if (keys.a) movement.x -= moveSpeed;
    if (keys.d) movement.x += moveSpeed;
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
        camera.position.x = playerMesh.position.x;
        camera.position.y = playerMesh.position.y + 3;
        camera.position.z = playerMesh.position.z + 5;
        camera.lookAt(playerMesh.position);

       
        document.getElementById('playerPosition').textContent = 
            `x: ${playerMesh.position.x.toFixed(2)}, y: ${playerMesh.position.y.toFixed(2)}, z: ${playerMesh.position.z.toFixed(2)}`;
        document.getElementById('playerJumping').textContent = isJumping;
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
}

window.updateGameSettings = updateGameSettings;
