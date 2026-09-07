"""Serveur local d'édition photo/vidéo par IA.

Tourne 100% en local (aucun appel réseau externe une fois le modèle
téléchargé) sur GPU Nvidia (CUDA). Expose une API utilisée par la page
frontend/index.html servie sur http://localhost:8000.
"""
import io
import os
import tempfile
import uuid

import ffmpeg
import torch
from diffusers import StableDiffusionInpaintPipeline, StableVideoDiffusionPipeline
from diffusers.utils import export_to_video
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageFilter, ImageOps

MODEL_ID = os.environ.get("INPAINT_MODEL_ID", "stabilityai/stable-diffusion-2-inpainting")
VIDEO_MODEL_ID = os.environ.get("VIDEO_MODEL_ID", "stabilityai/stable-video-diffusion-img2vid-xt")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="Local AI Photo Editor")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TMP_DIR = os.path.join(tempfile.gettempdir(), "local-ai-photo-editor")
os.makedirs(TMP_DIR, exist_ok=True)

_pipe = None
_video_pipe = None


def get_pipeline() -> StableDiffusionInpaintPipeline:
    """Charge le modèle d'inpainting une seule fois (lazy, coûteux)."""
    global _pipe
    if _pipe is None:
        dtype = torch.float16 if DEVICE == "cuda" else torch.float32
        _pipe = StableDiffusionInpaintPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
        _pipe = _pipe.to(DEVICE)
        if DEVICE == "cuda":
            _pipe.enable_attention_slicing()
    return _pipe


def get_video_pipeline() -> StableVideoDiffusionPipeline:
    """Charge le modèle image->vidéo une seule fois.

    Optimisé pour un GPU à VRAM limitée (ex: 6 Go) : offloading CPU des
    modules + slicing VAE, au prix de la vitesse.
    """
    global _video_pipe
    if _video_pipe is None:
        dtype = torch.float16 if DEVICE == "cuda" else torch.float32
        _video_pipe = StableVideoDiffusionPipeline.from_pretrained(
            VIDEO_MODEL_ID, torch_dtype=dtype, variant="fp16" if DEVICE == "cuda" else None
        )
        if DEVICE == "cuda":
            _video_pipe.enable_model_cpu_offload()
            _video_pipe.vae.enable_slicing()
            _video_pipe.vae.enable_tiling()
        else:
            _video_pipe = _video_pipe.to(DEVICE)
    return _video_pipe


def _resize_for_model(img: Image.Image, size: int = 512) -> Image.Image:
    return img.convert("RGB").resize((size, size))


@app.get("/api/status")
def status():
    return {
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "model_id": MODEL_ID,
        "model_loaded": _pipe is not None,
        "video_model_id": VIDEO_MODEL_ID,
        "video_model_loaded": _video_pipe is not None,
    }


@app.post("/api/inpaint")
async def inpaint(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form("photo réaliste, peau naturelle, cheveux détaillés, haute qualité"),
    negative_prompt: str = Form("flou, déformé, artefact, basse qualité"),
    steps: int = Form(30),
    guidance_scale: float = Form(7.5),
):
    """Efface un objet peint en blanc sur le masque et le remplace par un
    résultat généré par IA cohérent avec le reste de la photo."""
    image_bytes = await image.read()
    mask_bytes = await mask.read()

    src = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    original_size = src.size

    mask_img = Image.open(io.BytesIO(mask_bytes)).convert("L")
    mask_img = ImageOps.autocontrast(mask_img)
    if mask_img.size != src.size:
        mask_img = mask_img.resize(src.size)

    model_input = _resize_for_model(src)
    model_mask = _resize_for_model(mask_img).convert("L")
    # léger flou du masque pour un raccord plus naturel
    model_mask = model_mask.filter(ImageFilter.GaussianBlur(4))

    pipe = get_pipeline()
    generator = torch.Generator(device=DEVICE).manual_seed(42)
    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=model_input,
        mask_image=model_mask,
        num_inference_steps=steps,
        guidance_scale=guidance_scale,
        generator=generator,
    ).images[0]

    result = result.resize(original_size)

    out_name = f"{uuid.uuid4().hex}.png"
    out_path = os.path.join(TMP_DIR, out_name)
    result.save(out_path)
    return {"result_url": f"/api/result/{out_name}"}


@app.get("/api/result/{name}")
def get_result(name: str):
    path = os.path.join(TMP_DIR, name)
    if not os.path.isfile(path):
        return JSONResponse(status_code=404, content={"error": "not found"})
    return FileResponse(path, media_type="image/png")


@app.post("/api/video/trim")
async def trim_video(
    video: UploadFile = File(...),
    start: float = Form(0),
    end: float = Form(...),
):
    """Découpe une vidéo importée entre `start` et `end` secondes, en local via ffmpeg."""
    in_name = f"{uuid.uuid4().hex}_{video.filename}"
    in_path = os.path.join(TMP_DIR, in_name)
    with open(in_path, "wb") as f:
        f.write(await video.read())

    out_name = f"{uuid.uuid4().hex}.mp4"
    out_path = os.path.join(TMP_DIR, out_name)

    (
        ffmpeg.input(in_path, ss=start, to=end)
        .output(out_path, c="copy")
        .overwrite_output()
        .run(quiet=True)
    )

    return {"result_url": f"/api/video/{out_name}"}


@app.get("/api/video/{name}")
def get_video(name: str):
    path = os.path.join(TMP_DIR, name)
    if not os.path.isfile(path):
        return JSONResponse(status_code=404, content={"error": "not found"})
    return FileResponse(path, media_type="video/mp4")


@app.post("/api/image-to-video")
async def image_to_video(
    image: UploadFile = File(...),
    motion: int = Form(90),
    num_frames: int = Form(14),
    fps: int = Form(7),
    resolution: int = Form(512),
):
    """Anime une photo importée (Stable Video Diffusion).

    Important : ce modèle ne suit PAS une consigne textuelle d'action (il
    n'existe pas d'équivalent gratuit fiable pour ça aujourd'hui). Il génère
    un mouvement plausible (léger déplacement de caméra/scène) à partir de
    l'image, réglable via `motion` (intensité) et `num_frames` (durée).
    Réglages par défaut pensés pour tenir sur un GPU 6 Go de VRAM.
    """
    image_bytes = await image.read()
    src = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # SVD attend des dimensions multiples de 64, et fonctionne en 1024x576 à
    # l'origine ; on réduit fortement pour rester dans 6 Go de VRAM.
    resolution = max(256, min(resolution, 576))
    w = resolution - (resolution % 64)
    h = int(w * 9 / 16)
    h = h - (h % 64)
    src = src.resize((w, h))

    pipe = get_video_pipeline()
    generator = torch.Generator(device="cpu").manual_seed(42)
    frames = pipe(
        src,
        num_frames=min(max(num_frames, 8), 25),
        motion_bucket_id=min(max(motion, 1), 255),
        noise_aug_strength=0.02,
        decode_chunk_size=2,
        generator=generator,
    ).frames[0]

    out_name = f"{uuid.uuid4().hex}.mp4"
    out_path = os.path.join(TMP_DIR, out_name)
    export_to_video(frames, out_path, fps=fps)
    return {"result_url": f"/api/video/{out_name}"}


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
