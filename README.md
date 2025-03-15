# Dungeon PvP Game

A multiplayer fighting game with 3D graphics using Three.js and Flask-SocketIO.

## Features

- Real-time multiplayer combat
- Character selection (Warrior/Mage)
- Player names displayed above characters
- Dark color scheme with black ground and gray background
- Physics with gravity and jumping
- Smooth camera following

## Project Structure

```
dungeon.pvp/
├── src/
│   ├── game/
│   │   └── server.py       # Main game server
│   └── static/
│       ├── game.js         # Game client logic
│       └── index.html      # Main HTML file
├── Dockerfile             # Docker configuration
├── requirements.txt       # Python dependencies
└── render.yaml           # Render.com deployment config
```

## Development Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python src/game/server.py
```

3. Open http://localhost:8080 in your browser

## Docker Setup

1. Build the image:
```bash
docker build -t dungeon-pvp .
```

2. Run the container:
```bash
docker run -p 8080:8080 dungeon-pvp
```

## Controls

- W/A/S/D: Move character
- Space: Jump

## Deployment

The game can be deployed to Render.com using the provided `render.yaml` configuration.
