#!/usr/bin/env bash
# Start the Unlimited OCR 2 server on 127.0.0.1:10000 (after setup.sh). Ready when the log says
# "The server is fired up and ready to roll!" (a few minutes on the first start, which compiles kernels).
# Stop it with: pkill -f sglang.launch_server   (it holds most of the GPU memory while running)
#
# Settings follow the model card, scaled from an 80 GB card to one 16 GB card: four requests at a time
# (ocr_second.py sends four pages at once) and smaller CUDA-graph buckets. With
# --mem-fraction-static 0.8 only about 1 GB was left while the graphs were captured; 0.75 was stable.
set -euo pipefail
UOCR_HOME="${UOCR_HOME:-$HOME/uocr2}"
cd "$UOCR_HOME"
source .venv/bin/activate

if [ -z "${CUDA_HOME:-}" ] && ! command -v nvcc >/dev/null; then
  CUDA_HOME="$(python -c 'import nvidia, os; print(os.path.join(nvidia.__path__[0], "cu13"))')"
  export CUDA_HOME PATH="$CUDA_HOME/bin:$PATH"
  export LD_LIBRARY_PATH="$CUDA_HOME/lib:${LD_LIBRARY_PATH:-}"
fi
[ -d /usr/lib/wsl/lib ] && export LD_LIBRARY_PATH="/usr/lib/wsl/lib:${LD_LIBRARY_PATH:-}"

export SGLANG_UOCR_EANABLE_DOC_LIMIT=1
export SGLANG_UOCR_DOC_GUNDAM_PAGE_WINDOW=10
export SGLANG_UOCR_DOC_BASE_PAGE_WINDOW=10
export SGLANG_UOCR_MAX_PAGE_TOKENS=20000
export SGLANG_OPT_UOCR_SAM_REL_POS_BIAS_MB=64
export SGLANG_UOCR_SHM_WRAP_MODEL_DATA=1
export SGLANG_UOCR_SHM_WRAP_MIN_MB=1
export SGLANG_VLM_CACHE_SIZE_MB=0
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

exec python -m sglang.launch_server \
    --model-path ./model \
    --served-model-name Unlimited-OCR-2 \
    --chat-template unlimited-ocr \
    --tokenizer-backend fastokens \
    --tokenizer-worker-num 4 \
    --mem-fraction-static "${UOCR_MEM_FRACTION:-0.75}" \
    --max-running-requests 4 \
    --max-prefill-tokens 2048 \
    --enable-custom-logit-processor \
    --enable-streaming-session \
    --allow-auto-truncate \
    --disable-radix-cache \
    --mm-preprocess-cache-size-mb 0 \
    --cuda-graph-backend-decode full --cuda-graph-max-bs-decode 4 \
    --cuda-graph-backend-prefill full \
    --cuda-graph-max-bs-prefill 2048 \
    --cuda-graph-bs-prefill 1024 2048 \
    --cuda-graph-config '{"prefill": {"backend": "full", "full_prefill_max_req": 4}}' \
    --host 127.0.0.1 \
    --port "${UOCR_PORT:-10000}"
