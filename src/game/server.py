from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import time

app = Flask(__name__)
app.static_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'static'))
app.template_folder = app.static_folder
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

players = {}

@app.route('/')
def index():
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        print(f"Error serving index.html: {e}")
        print(f"Static folder: {app.static_folder}")
        print(f"Files in static folder: {os.listdir(app.static_folder)}")
        raise

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
        emit('players', [{'id': id, **data} for id, data in players.items()], broadcast=True)

@socketio.on('playerSelect')
def handle_player_select(data):
    name = data.get('name', '')
    player_type = data.get('type', '')
    
    if not (3 <= len(name) <= 15) or player_type not in ['warrior', 'mage']:
        return
        
    players[request.sid] = {
        'id': request.sid,
        'name': name,
        'type': player_type,
        'position': {'x': 0, 'y': -4, 'z': 0},
        'rotation': 0  # Initialize rotation to 0
    }
    emit('players', [{'id': id, **data} for id, data in players.items()], broadcast=True)

@socketio.on('playerMove')
def handle_player_move(position):
    if request.sid in players:
        if 'x' in position and 'y' in position and 'z' in position:
            players[request.sid]['position'] = position
            emit('playerMoved', {'id': request.sid, 'position': position}, broadcast=True)
        else:
            print("Invalid position data")

@socketio.on('playerRotate')
def handle_player_rotate(rotation):
    if request.sid in players:
        if isinstance(rotation, (int, float)):
            players[request.sid]['rotation'] = rotation
            emit('playerRotated', {'id': request.sid, 'rotation': rotation}, broadcast=True)
        else:
            print("Invalid rotation data")

@socketio.on('kickPlayer')
def handle_kick_player(data):
    player_id = data.get('id')
    if request.sid in players and players[request.sid]['name'] == 'swami' and player_id in players:
        socketio.emit('kicked', room=player_id)
        del players[player_id]
        emit('players', [{'id': id, **data} for id, data in players.items()], broadcast=True)

@socketio.on('chatMessage')
def handle_chat_message(data):
    if request.sid in players:
        sender_name = players[request.sid]['name']
        message = data.get('message', '').strip()
        if message and len(message) <= 200:  # Limitar longitud del mensaje
            emit('chatMessage', {
                'sender': sender_name,
                'message': message,
                'timestamp': int(time.time() * 1000)
            }, broadcast=True)

if __name__ == '__main__':
    print(f"Static folder path: {app.static_folder}")
    print(f"Files in static folder: {os.listdir(app.static_folder)}")
    port = int(os.environ.get('PORT', 10000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print(f"Starting server on http://0.0.0.0:{port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)
