#!/bin/bash
# Script pour démarrer Quiz Agent sur le port 8001
echo "Démarrage de Quiz Agent sur le port 8001..."
source venv/bin/activate
python quiz_api_server.py
