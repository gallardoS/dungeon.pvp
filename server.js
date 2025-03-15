const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

const players = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('playerSelect', (characterType) => {
        players.set(socket.id, {
            id: socket.id,
            type: characterType,
            position: { x: 0, y: 0, z: 0 }
        });
        io.emit('players', Array.from(players.values()));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        players.delete(socket.id);
        io.emit('players', Array.from(players.values()));
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
