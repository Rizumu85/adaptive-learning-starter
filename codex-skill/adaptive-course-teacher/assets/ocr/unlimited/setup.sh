#!/usr/bin/env bash
# One-time setup of the Unlimited OCR 2 server (the authors' customised SGLang) on Linux or WSL2.
# Needs an NVIDIA GPU visible to Linux (nvidia-smi works) and about 25 GB of disk.
# Everything goes under $UOCR_HOME (default ~/uocr2): a Python 3.10 venv and the model.
set -euo pipefail
UOCR_HOME="${UOCR_HOME:-$HOME/uocr2}"
command -v uv >/dev/null || [ -x "$HOME/.local/bin/uv" ] || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
mkdir -p "$UOCR_HOME" && cd "$UOCR_HOME"
[ -d .venv ] || uv venv --python 3.10
source .venv/bin/activate

# The model repository also carries the SGLang build that serves it (wheel/).
uv pip install "huggingface-hub==0.36.0"
[ -f model/config.json ] || python -c "from huggingface_hub import snapshot_download; snapshot_download('baidu/Unlimited-OCR-2', local_dir='model')"
uv pip install model/wheel/sglang-*.whl
uv pip install pymupdf==1.27.2.2 fastokens==0.3.2

# Kernels are compiled on first start. Without a system CUDA toolkit, use the one pip installed:
# it ships cu13/lib/libcudart.so.13 only, while the build links -L$CUDA_HOME/lib64 -lcudart.
C="$(python -c 'import nvidia, os; print(os.path.join(nvidia.__path__[0], "cu13"))')"
[ -e "$C/lib64" ] || ln -s lib "$C/lib64"
[ -e "$C/lib/libcudart.so" ] || ln -s libcudart.so.13 "$C/lib/libcudart.so"

python -c "import torch, sglang; print('torch', torch.__version__, 'GPU', torch.cuda.is_available() and torch.cuda.get_device_name(0)); print('sglang', sglang.__version__)"
