@echo off
REM Installe automatiquement l'environnement (Windows).
cd /d "%~dp0backend"

if not exist ".venv" (
  echo Creation de l'environnement virtuel...
  python -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip

echo.
echo Detection du GPU...
where nvidia-smi >nul 2>nul
if %ERRORLEVEL%==0 (
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
  echo Installation de PyTorch avec support CUDA 12.1...
  pip install torch --index-url https://download.pytorch.org/whl/cu121
) else (
  echo Aucun GPU Nvidia detecte. Installation de PyTorch CPU (tres lent pour l'IA).
  pip install torch
)

pip install -r requirements.txt

echo.
echo Installation terminee. Pour lancer l'outil :
echo   cd backend ^&^& .venv\Scripts\activate ^&^& uvicorn main:app --host 127.0.0.1 --port 8000
echo Puis ouvre http://localhost:8000
pause
