# Éditeur Photo/Vidéo IA — 100% local

Petit outil qui tourne entièrement sur ta machine (aucune donnée envoyée sur
un serveur externe une fois le modèle téléchargé) :

- Importer une photo, faire des retouches classiques (luminosité, contraste,
  saturation, rotation).
- Peindre au pinceau la zone à effacer (ex: une casquette sur une tête) et
  laisser un modèle d'IA générative (Stable Diffusion Inpainting) reconstruire
  la zone de façon cohérente avec le reste de la photo.
- Importer une vidéo et la découper (début/fin).

Le calcul IA se fait via ton GPU Nvidia (CUDA) grâce à PyTorch + diffusers.

## Prérequis

- Python 3.10 ou 3.11
- Un GPU Nvidia avec les drivers CUDA installés
- [ffmpeg](https://ffmpeg.org/download.html) installé et accessible dans le PATH (pour la découpe vidéo)

## Installation

```bash
cd local-ai-photo-editor/backend
python -m venv .venv
# Windows: .venv\Scripts\activate    |   Linux/Mac: source .venv/bin/activate
source .venv/bin/activate

# 1) Installe PyTorch avec support CUDA (adapte cu121 à ta version de CUDA,
#    voir https://pytorch.org/get-started/locally/)
pip install torch --index-url https://download.pytorch.org/whl/cu121

# 2) Installe le reste des dépendances
pip install -r requirements.txt
```

## Lancer l'outil

```bash
cd local-ai-photo-editor/backend
uvicorn main:app --host 127.0.0.1 --port 8000
```

Puis ouvre ton navigateur sur **http://localhost:8000**.

Au premier lancement de l'IA, le modèle (~5 Go) est téléchargé automatiquement
depuis Hugging Face et mis en cache localement (`~/.cache/huggingface`). Les
générations suivantes sont ensuite 100% locales, sans connexion internet
nécessaire.

## Utilisation — retirer un objet (ex: une casquette)

1. Onglet **Photo** → **Importer une photo**.
2. **✏️ Activer le pinceau**, puis peins en rouge la zone à effacer (la
   casquette). Ajuste la taille du pinceau si besoin.
3. (Optionnel) Décris le résultat attendu, ex. `cheveux bruns, peau naturelle`.
4. Clique sur **✨ Générer**. Le traitement prend de quelques secondes à ~1
   minute selon ton GPU.
5. **Télécharger le résultat** une fois satisfait.

## Notes techniques

- Backend : FastAPI + `diffusers` (`StableDiffusionInpaintPipeline`,
  modèle `stabilityai/stable-diffusion-2-inpainting` par défaut, modifiable via
  la variable d'environnement `INPAINT_MODEL_ID`).
- Frontend : une seule page HTML/JS sans dépendance externe, servie
  directement par le backend.
- Vidéo : découpe simple via `ffmpeg-python` (copie de flux, rapide, sans
  ré-encodage).
- Aucune donnée (photo/vidéo) ne quitte ta machine : tout est traité et
  stocké dans un dossier temporaire local.
