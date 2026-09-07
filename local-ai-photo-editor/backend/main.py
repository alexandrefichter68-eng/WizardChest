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
from diffusers import StableDiffusionInpaintPipeline
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageFilter, ImageOps

MODEL_ID = os.environ.get("INPAINT_MODEL_ID", "stabilityai/stable-diffusion-2-inpainting")
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


def _resize_for_model(img: Image.Image, size: int = 512) -> Image.Image:
    return img.convert("RGB").resize((size, size))


@app.get("/api/status")
def status():
    return {
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "model_id": MODEL_ID,
        "model_loaded": _pipe is not None,
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


frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
