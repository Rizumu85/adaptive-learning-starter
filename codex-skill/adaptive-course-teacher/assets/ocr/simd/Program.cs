// Fast path for ocr_draft.py: PP-OCRv6 medium through SimdPaddleOCR, on the GPU (Vulkan or Metal) when
// the machine has a capable one and on the CPU otherwise.
//
//   dotnet ocr-fast.dll <list file> <output folder>
//
// The list file has one page per line: "<label><TAB><image path>". Writes <label>.json per page in the
// shape ocr_draft.py documents, with boxes on a page 1000 units wide. "score" is null: the library
// reports a raw recognition value, not a confidence between 0 and 1.
// OCR_FAST_BACKEND=cpu|vulkan|metal overrides the automatic choice.
using System.Diagnostics;
using System.Text.Json;
using Sdcb.SimdPaddleOCR;
using Sdcb.SimdPaddleOCR.Models.ChineseV6Medium;
using SkiaSharp;

if (args.Length < 2) { Console.Error.WriteLine("usage: ocr-fast <list file> <output folder>"); return 2; }
OcrBackend backend = (Environment.GetEnvironmentVariable("OCR_FAST_BACKEND") ?? "auto").ToLowerInvariant() switch
{
    "cpu" => OcrBackend.Cpu,
    "vulkan" => OcrBackend.Vulkan,
    "metal" => OcrBackend.Metal,
    _ => OcrBackend.Auto,
};
Directory.CreateDirectory(args[1]);
using PaddleOcrAll ocr = await PaddleOcrAll.LoadAsync(ChineseV6MediumModels.Default, new PaddleOcrOptions
{
    Detector = new PaddleOcrDetectorOptions { Backend = backend },
    Recognizer = new PaddleOcrRecognizerOptions { Backend = backend },
    Classifier = new PaddleOcrClassifierOptions { Backend = backend },
});
JsonSerializerOptions json = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping, WriteIndented = true };
Stopwatch all = Stopwatch.StartNew();
int pages = 0;
foreach (string entry in File.ReadAllLines(args[0]))
{
    string[] parts = entry.Split('\t', 2);
    if (parts.Length < 2) continue;
    SKBitmap decoded = SKBitmap.Decode(parts[1]) ?? throw new InvalidDataException("cannot read " + parts[1]);
    using SKBitmap image = decoded.ColorType == SKColorType.Bgra8888 ? decoded : decoded.Copy(SKColorType.Bgra8888);
    if (!ReferenceEquals(image, decoded)) decoded.Dispose();
    int stride = image.RowBytes;
    PaddleOcrResult result;
    unsafe
    {
        result = ocr.Run(new ReadOnlySpan<byte>((byte*)image.GetPixels(), stride * image.Height), image.Width, image.Height, stride, ImagePixelFormat.Bgra32);
    }
    float k = 1000f / image.Width;
    var lines = result.Lines.Select(l =>
    {
        float[] xs = [l.Box.X1, l.Box.X2, l.Box.X3, l.Box.X4], ys = [l.Box.Y1, l.Box.Y2, l.Box.Y3, l.Box.Y4];
        return new { text = l.Text, score = (float?)null, box = new[] { MathF.Round(xs.Min() * k, 1), MathF.Round(ys.Min() * k, 1), MathF.Round(xs.Max() * k, 1), MathF.Round(ys.Max() * k, 1) } };
    }).ToArray();
    File.WriteAllText(Path.Combine(args[1], parts[0] + ".json"), JsonSerializer.Serialize(new { page = parts[0], width = image.Width, height = image.Height, lines }, json));
    Console.WriteLine($"{parts[0]} {lines.Length} lines");
    pages++;
}
Console.Error.WriteLine($"engine: PP-OCRv6 medium through SimdPaddleOCR ({backend}), {pages} pages in {all.Elapsed.TotalSeconds:F1} s");
return 0;
