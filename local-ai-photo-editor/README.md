# Éditeur Photo/Vidéo IA — 100% local

Petit outil qui tourne entièrement sur ta machine (aucune donnée envoyée sur
un serveur externe une fois le modèle téléchargé) :

- Importer une photo, faire des retouches classiques (luminosité, contraste,
  saturation, rotation).
- Peindre au pinceau la zone à effacer (ex: une casquette sur une tête) et
  laisser un modèle d'IA générative (Stable Diffusion Inpainting) reconstruire
  la zone de façon cohérente avec le reste de la photo.
- Animer une photo par IA (Stable Video Diffusion) pour en faire une courte
  vidéo, ou importer une vidéo existante et la découper (début/fin).

Le calcul IA se fait via ton GPU Nvidia (CUDA) grâce à PyTorch + diffusers.

> **Limite honnête sur la vidéo** : aucune IA gratuite (locale ou en ligne)
> ne sait aujourd'hui prendre une photo + une consigne textuelle précise
> ("je joue au tennis") et produire une vidéo fidèle à cette action — même
> les services payants ont beaucoup de mal. Le modèle local utilisé ici
> (Stable Video Diffusion) anime la photo avec un **mouvement plausible**
> (léger mouvement de caméra/scène), sans contrôle du contenu de l'action.

## Prérequis

- Python 3.10 ou 3.11
- Un GPU Nvidia avec les drivers CUDA installés (testé avec une RTX 2060, 6 Go
  de VRAM : l'inpainting est rapide, la vidéo est possible mais lente,
  plusieurs minutes par génération)
- [ffmpeg](https://ffmpeg.org/download.html) installé et accessible dans le PATH (pour la vidéo)

## Installation automatique

Je ne peux pas exécuter ces commandes sur ta machine (je tourne dans un
environnement cloud isolé, sans accès à ton PC) — lance toi-même le script
correspondant à ton OS, une seule fois :

- **Windows** : double-clique sur `setup.bat` (à la racine de
  `local-ai-photo-editor/`).
- **Linux/Mac** :
  ```bash
  cd local-ai-photo-editor
  chmod +x setup.sh
  ./setup.sh
  ```

Le script crée l'environnement virtuel Python, détecte ton GPU Nvidia et
installe PyTorch + toutes les dépendances automatiquement.

## Installation manuelle (si tu préfères)

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

## Utilisation — animer une photo

1. Onglet **Vidéo** → **Importer une photo à animer**.
2. Ajuste l'intensité du mouvement et le nombre d'images si besoin.
3. **🎬 Générer la vidéo**. Sur une RTX 2060, compte 3-8 minutes.

## Notes techniques

- Backend : FastAPI + `diffusers` :
  - `StableDiffusionInpaintPipeline` (modèle
    `stabilityai/stable-diffusion-2-inpainting` par défaut, modifiable via la
    variable d'environnement `INPAINT_MODEL_ID`) pour la suppression d'objet.
  - `StableVideoDiffusionPipeline` (modèle
    `stabilityai/stable-video-diffusion-img2vid-xt` par défaut, modifiable via
    `VIDEO_MODEL_ID`) pour l'animation photo → vidéo, avec `enable_model_cpu_offload`
    + VAE slicing/tiling pour tenir sur un GPU à VRAM limitée (6 Go).
- Frontend : une seule page HTML/JS sans dépendance externe, servie
  directement par le backend.
- Découpe vidéo : via `ffmpeg-python` (copie de flux, rapide, sans
  ré-encodage).
- Aucune donnée (photo/vidéo) ne quitte ta machine : tout est traité et
  stocké dans un dossier temporaire local.
- Les modèles (~5 Go pour l'inpainting, ~10 Go pour la vidéo) sont
  téléchargés depuis Hugging Face au premier lancement de chaque
  fonctionnalité, puis mis en cache localement — les générations suivantes
  n'ont plus besoin d'internet.
