from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='../static', template_folder='../static')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

players = {}

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory(app.static_folder, path)

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in players:
        del players[request.sid]
        emit('players', list(players.values()), broadcast=True)

@socketio.on('playerSelect')
def handle_player_select(data):
    if not isinstance(data, dict) or 'name' not in data or 'type' not in data:
        return
    
    name = str(data['name']).strip()
    player_type = str(data['type']).strip()
    
    if not (3 <= len(name) <= 15) or player_type not in ['warrior', 'mage']:
        return
    
    players[request.sid] = {
        'id': request.sid,
        'name': name,
        'type': player_type,
        'position': {'x': 0, 'y': -2, 'z': 0}
    }
    emit('players', list(players.values()), broadcast=True)

@socketio.on('playerMove')
def handle_player_move(position):
    if not isinstance(position, dict) or not all(k in position for k in ('x', 'y', 'z')):
        return
        
    if request.sid in players:
        x = max(min(float(position['x']), 10), -10)
        y = max(min(float(position['y']), 5), -2)
        z = max(min(float(position['z']), 10), -10)
        
        players[request.sid]['position'] = {'x': x, 'y': y, 'z': z}
        emit('playerMoved', {
            'id': request.sid,
            'position': players[request.sid]['position']
        }, broadcast=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print(f"Starting server on http://0.0.0.0:{port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
