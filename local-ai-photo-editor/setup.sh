#!/usr/bin/env bash
# Installe automatiquement l'environnement (Linux/Mac).
set -e
cd "$(dirname "$0")/backend"

if [ ! -d ".venv" ]; then
  echo "Création de l'environnement virtuel..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install --upgrade pip

echo
echo "Détection du GPU..."
if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
  echo "Installation de PyTorch avec support CUDA 12.1..."
  pip install torch --index-url https://download.pytorch.org/whl/cu121
else
  echo "Aucun GPU Nvidia détecté (nvidia-smi introuvable). Installation de PyTorch CPU (très lent pour l'IA)."
  pip install torch
fi

pip install -r requirements.txt

echo
echo "Installation terminée. Pour lancer l'outil :"
echo "  cd backend && source .venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8000"
echo "Puis ouvre http://localhost:8000"
