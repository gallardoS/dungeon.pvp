let scene, camera, renderer;
let socket;
const players = new Map();
let localPlayer = null;
const moveSpeed = 0.1;
const gravity = -0.01;
const floorY = -2;
let socketConnected = false;
let velocity = 0;
const jumpForce = 0.2;
const keys = { w: false, a: false, s: false, d: false, ' ': false };

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = floorY;
    scene.add(ground);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    applyPhysics();
    updateCamera();
    updatePlayerLabels();
    renderer.render(scene, camera);
}

function updateCamera() {
    if (localPlayer) {
        const targetPosition = new THREE.Vector3(
            localPlayer.mesh.position.x,
            localPlayer.mesh.position.y + 2,
            localPlayer.mesh.position.z + 8
        );
        camera.position.lerp(targetPosition, 0.1);
        camera.lookAt(localPlayer.mesh.position);
    }
}

function updatePlayerLabels() {
    players.forEach((playerObj) => {
        if (playerObj.label) {
            playerObj.label.position.set(
                playerObj.mesh.position.x,
                playerObj.mesh.position.y + 1.5,
                playerObj.mesh.position.z
            );
            playerObj.label.quaternion.copy(camera.quaternion);
        }
    });
}

function applyPhysics() {
    players.forEach((playerObj) => {
        const mesh = playerObj.mesh;
        if (mesh.position.y > floorY) {
            velocity += gravity;
            mesh.position.y += velocity;

            if (mesh.position.y < floorY) {
                mesh.position.y = floorY;
                velocity = 0;
            }

            if (mesh === localPlayer.mesh) {
                socket.emit('playerMove', {
                    x: mesh.position.x,
                    y: mesh.position.y,
                    z: mesh.position.z
                });
            }
        }
    });
}

function createCharacterMesh(type, name) {
    let geometry, material;
    if (type === 'warrior') {
        geometry = new THREE.BoxGeometry(1, 1, 1);
    } else {
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
    }
    material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.font = 'bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(name, 128, 44);

    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ map: texture });
    const label = new THREE.Sprite(labelMaterial);
    label.scale.set(2, 0.5, 1);
    scene.add(label);

    return { mesh, label };
}

function handleKeyDown(event) {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = true;
        if (event.key === ' ' && localPlayer && localPlayer.mesh.position.y <= floorY) {
            velocity = jumpForce;
        }
    }
}

function handleKeyUp(event) {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = false;
    }
}

function updateMovement() {
    if (!localPlayer) return;

    let moved = false;
    const movement = { x: 0, z: 0 };

    if (keys.w) { movement.z -= moveSpeed; moved = true; }
    if (keys.s) { movement.z += moveSpeed; moved = true; }
    if (keys.a) { movement.x -= moveSpeed; moved = true; }
    if (keys.d) { movement.x += moveSpeed; moved = true; }

    if (moved) {
        localPlayer.mesh.position.x += movement.x;
        localPlayer.mesh.position.z += movement.z;
        socket.emit('playerMove', {
            x: localPlayer.mesh.position.x,
            y: localPlayer.mesh.position.y,
            z: localPlayer.mesh.position.z
        });
    }
}

function initSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    socket = io(`${protocol}//${host}`);

    socket.on('connect', () => {
        document.getElementById('debug').textContent = 'Connection status: Connected';
        socketConnected = true;
    });

    socket.on('connect_error', (error) => {
        document.getElementById('debug').textContent = 'Connection status: Error - ' + error.message;
        socketConnected = false;
    });

    socket.on('disconnect', (reason) => {
        document.getElementById('debug').textContent = 'Connection status: Disconnected';
        socketConnected = false;
    });

    socket.on('players', (playerList) => {
        for (const [id, playerObj] of players.entries()) {
            if (!playerList.find(p => p.id === id)) {
                scene.remove(playerObj.mesh);
                scene.remove(playerObj.label);
                players.delete(id);
            }
        }

        playerList.forEach(playerData => {
            if (!players.has(playerData.id)) {
                const playerObj = createCharacterMesh(playerData.type, playerData.name);
                playerObj.mesh.position.set(
                    playerData.position.x,
                    floorY,
                    playerData.position.z
                );
                players.set(playerData.id, playerObj);
                scene.add(playerObj.mesh);

                if (playerData.id === socket.id) {
                    localPlayer = playerObj;
                }
            }
        });
    });

    socket.on('playerMoved', (data) => {
        const playerObj = players.get(data.id);
        if (playerObj && playerObj !== localPlayer) {
            playerObj.mesh.position.set(data.position.x, data.position.y, data.position.z);
        }
    });
}

function selectCharacter(type) {
    socket.emit('playerSelect', {
        name: window.playerName,
        type: type
    });
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
