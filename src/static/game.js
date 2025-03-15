let scene, camera, renderer, socket;
let players = {};
let playerMesh;
let velocity = 0;
let isJumping = false;
let gravity = -0.015;
let moveSpeed = 0.1;
let jumpForce = 0.3;
const floorY = -4;

// Objeto para mantener el estado de las teclas
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
    geometry.translate(0, 1, 0); // Mover el origen a la base del personaje
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
    sprite.position.y = 3; // Ajustando la altura del nombre para que esté sobre el personaje
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
}

function initSocket() {
    socket = io();

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
                    velocity: 0,
                    isJumping: false
                };
                
                if (player.id === socket.id) {
                    playerMesh = mesh;
                }
            } else {
                // Actualizar posición de jugadores existentes
                players[player.id].mesh.position.set(player.position.x, player.position.y, player.position.z);
            }
        });

        Object.keys(players).forEach(id => {
            if (!playerList.find(p => p.id === id)) {
                scene.remove(players[id].mesh);
                delete players[id];
            }
        });
    });

    socket.on('playerMoved', data => {
        if (players[data.id] && data.id !== socket.id) {
            // Actualizar posición del jugador remoto
            const player = players[data.id];
            player.mesh.position.set(data.position.x, data.position.y, data.position.z);
            
            // Aplicar física al jugador remoto
            if (data.position.y > floorY) {
                player.isJumping = true;
            } else {
                player.isJumping = false;
                player.velocity = 0;
            }
        }
    });
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

    const oldPosition = playerMesh.position.clone();
    let moved = false;

    if (keys.w) {
        playerMesh.position.z -= moveSpeed;
        moved = true;
    }
    if (keys.s) {
        playerMesh.position.z += moveSpeed;
        moved = true;
    }
    if (keys.a) {
        playerMesh.position.x -= moveSpeed;
        moved = true;
    }
    if (keys.d) {
        playerMesh.position.x += moveSpeed;
        moved = true;
    }
    if (keys[' '] && !isJumping && playerMesh.position.y <= floorY) {
        velocity = jumpForce;
        isJumping = true;
        moved = true;
    }

    if (moved && !oldPosition.equals(playerMesh.position)) {
        socket.emit('playerMove', {
            x: playerMesh.position.x,
            y: playerMesh.position.y,
            z: playerMesh.position.z
        });
    }
}

function applyPhysics() {
    // Aplicar física al jugador local
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

    // Aplicar física a los jugadores remotos
    Object.entries(players).forEach(([id, player]) => {
        if (id !== socket.id && player.mesh) {
            if (player.mesh.position.y > floorY) {
                player.velocity = (player.velocity || 0) + gravity;
                player.mesh.position.y += player.velocity;
                if (player.mesh.position.y < floorY) {
                    player.mesh.position.y = floorY;
                    player.velocity = 0;
                    player.isJumping = false;
                }
            }
        }
    });
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

        // Update debug panel with player info
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

// Add function to update game settings from debug panel
function updateGameSettings(settings) {
    if (settings.moveSpeed !== undefined) moveSpeed = settings.moveSpeed;
    if (settings.jumpForce !== undefined) jumpForce = settings.jumpForce;
    if (settings.gravity !== undefined) gravity = settings.gravity;
}

// Make updateGameSettings available globally
window.updateGameSettings = updateGameSettings;
