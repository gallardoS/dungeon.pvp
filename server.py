from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.static_folder = 'static'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

players = {}

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('static', path)

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)
    if request.sid in players:
        del players[request.sid]
        emit('players', list(players.values()), broadcast=True)

@socketio.on('playerSelect')
def handle_player_select(character_type):
    print(f'Player {request.sid} selected character: {character_type}')
    players[request.sid] = {
        'id': request.sid,
        'type': character_type,
        'position': {'x': 0, 'y': -2, 'z': 0}  # Start at ground level (y = -2)
    }
    print('Current players:', players)
    emit('players', list(players.values()), broadcast=True)

@socketio.on('playerMove')
def handle_player_move(position):
    if request.sid in players:
        players[request.sid]['position'] = position
        emit('playerMoved', {
            'id': request.sid,
            'position': position
        }, broadcast=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"Starting server on http://0.0.0.0:{port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
