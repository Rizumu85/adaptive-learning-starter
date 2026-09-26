// ../../scripts/install-image-preview.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var args = process.argv.slice(2);
var value = (flag, fallback = "") => {
  const at = args.indexOf(flag);
  return at < 0 ? fallback : args[at + 1];
};
if (args.includes("--help")) {
  console.log("node install-image-preview.cjs --project <existing-project> [--asset-dir assets/image-preview] [--force]\nCopies four offline runtime/license files; does not rewrite HTML. Existing different files require --force.");
  process.exit(0);
}
try {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") continue;
    if (!["--project", "--asset-dir"].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith("--")) throw Error(`Invalid argument: ${args[i]}`);
    i++;
  }
  const project = value("--project");
  if (!project) throw Error("--project is required");
  if (!(0, import_node_fs.existsSync)(project) || !(0, import_node_fs.statSync)(project).isDirectory()) throw Error("Project directory must already exist");
  const root = (0, import_node_fs.realpathSync)(project);
  const dir = value("--asset-dir", "assets/image-preview");
  const destination = (0, import_node_path.resolve)(root, dir);
  const rel = (0, import_node_path.relative)(root, destination);
  if (!rel || rel.startsWith("..") || (0, import_node_path.isAbsolute)(rel)) throw Error("Asset directory must be inside the project");
  let current = root;
  for (const part of rel.split(import_node_path.sep)) {
    current = (0, import_node_path.join)(current, part);
    if ((0, import_node_fs.existsSync)(current) && (0, import_node_fs.lstatSync)(current).isSymbolicLink()) throw Error("Asset directory cannot traverse a symlink or junction");
  }
  const source = (0, import_node_path.resolve)(__dirname, "../assets/image-preview");
  const files = ["image-preview.js", "image-preview.css", "panzoom-license.txt", "lucide-license.txt"];
  for (const name of files) {
    const from = (0, import_node_path.join)(source, name), to = (0, import_node_path.join)(destination, name);
    if (!(0, import_node_fs.existsSync)(from)) throw Error(`Incomplete package: ${name}`);
    if ((0, import_node_fs.existsSync)(to) && (0, import_node_fs.lstatSync)(to).isSymbolicLink()) throw Error(`Refusing linked file: ${to}`);
    if ((0, import_node_fs.existsSync)(to) && !(0, import_node_fs.readFileSync)(from).equals((0, import_node_fs.readFileSync)(to)) && !args.includes("--force")) throw Error(`Refusing to overwrite ${to}; inspect it before using --force`);
  }
  (0, import_node_fs.mkdirSync)(destination, { recursive: true });
  for (const name of files) (0, import_node_fs.copyFileSync)((0, import_node_path.join)(source, name), (0, import_node_path.join)(destination, name));
  const url = rel.split(/[\\/]/).map(encodeURIComponent).join("/");
  console.log(`Installed ${files.length} files. Add these to HTML at the project root (adjust paths for nested HTML):
<link rel="stylesheet" href="${url}/image-preview.css">
<script defer src="${url}/image-preview.js"></script>
Mark image links: <a data-image-preview href="full.webp"><img src="thumb.webp" alt="Description"></a>`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
