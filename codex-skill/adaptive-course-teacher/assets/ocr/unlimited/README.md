# Unlimited OCR 2 server

`ocr_second.py` (default engine) sends pages to Unlimited OCR 2 ([baidu/Unlimited-OCR-2](https://huggingface.co/baidu/Unlimited-OCR-2), 3B, MIT). It goes through the authors' customised SGLang server, which runs on Linux, or on Windows inside WSL2.

## Why the server

The model also runs through plain transformers. On Windows with a 16 GB card, though, that took 2–2.5 minutes a page. The GPU sat about 15% busy because most of the time went to Python overhead in the model's sparse attention, and its Triton kernels do not compile on Windows. Through the server on the same card:

- A dense page (about 1,100 characters) took 19 s.
- A short page took 2.4 s.
- Four pages in flight averaged 2.4 s a page.
- It used about 12 GB of GPU memory while running.

## Setup (once)

On Linux, or in WSL2 where `nvidia-smi` shows the card:

```bash
bash setup.sh          # uv, Python 3.10 venv, model (~7 GB), SGLang build; under ~/uocr2
```

From Windows, the scripts must be fed to WSL with Unix line endings:

```powershell
wsl -d Ubuntu -- bash -c "tr -d '\r' < /mnt/<drive>/<path>/assets/ocr/unlimited/setup.sh | bash"
```

## Each session

```bash
bash serve.sh > /tmp/uocr2-server.log 2>&1 &    # ready when the log says "fired up and ready to roll"
python ocr_second.py "work/source/p0*.jpg" work/ocr2/
pkill -f sglang.launch_server                   # frees the GPU
```

WSL2 forwards `127.0.0.1:10000` to Windows, so `ocr_second.py` can run on the Windows side.

## Notes

- **Harmless startup noise.** The torchcodec / FFmpeg tracebacks at startup only concern video decoding.
- **Pages are tiled.** Each page goes in its own request with tiling on (full resolution). One request with several pages uses a single low-resolution view per page. On the test pages that was slower (5.9 s a page) and less accurate: it read a heading as a picture and dropped its text.
- **Known misreading.** Katakana b and p get swapped: ブラシ came back as プラン and as プラシ. `ocr_compare.py` marks these.
