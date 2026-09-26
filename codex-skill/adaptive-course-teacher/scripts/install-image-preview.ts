import { existsSync, mkdirSync, readFileSync, copyFileSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, join, sep } from 'node:path';

const args = process.argv.slice(2);
const value = (flag: string, fallback = '') => { const at = args.indexOf(flag); return at < 0 ? fallback : args[at + 1]; };
if (args.includes('--help')) {
  console.log('node install-image-preview.cjs --project <existing-project> [--asset-dir assets/image-preview] [--force]\nCopies four offline runtime/license files; does not rewrite HTML. Existing different files require --force.');
  process.exit(0);
}
try {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') continue;
    if (!['--project', '--asset-dir'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Invalid argument: ${args[i]}`);
    i++;
  }
  const project = value('--project');
  if (!project) throw Error('--project is required');
  if (!existsSync(project) || !statSync(project).isDirectory()) throw Error('Project directory must already exist');
  const root = realpathSync(project);
  const dir = value('--asset-dir', 'assets/image-preview');
  const destination = resolve(root, dir);
  const rel = relative(root, destination);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw Error('Asset directory must be inside the project');
  let current = root;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw Error('Asset directory cannot traverse a symlink or junction');
  }
  const source = resolve(__dirname, '../assets/image-preview');
  const files = ['image-preview.js', 'image-preview.css', 'panzoom-license.txt', 'lucide-license.txt'];
  // Preflight the entire package before creating or overwriting any output.
  for (const name of files) {
    const from = join(source, name), to = join(destination, name);
    if (!existsSync(from)) throw Error(`Incomplete package: ${name}`);
    if (existsSync(to) && lstatSync(to).isSymbolicLink()) throw Error(`Refusing linked file: ${to}`);
    if (existsSync(to) && !readFileSync(from).equals(readFileSync(to)) && !args.includes('--force')) throw Error(`Refusing to overwrite ${to}; inspect it before using --force`);
  }
  mkdirSync(destination, { recursive: true });
  for (const name of files) copyFileSync(join(source, name), join(destination, name));
  const url = rel.split(/[\\/]/).map(encodeURIComponent).join('/');
  console.log(`Installed ${files.length} files. Add these to HTML at the project root (adjust paths for nested HTML):\n<link rel="stylesheet" href="${url}/image-preview.css">\n<script defer src="${url}/image-preview.js"></script>\nMark image links: <a data-image-preview href="full.webp"><img src="thumb.webp" alt="Description"></a>`);
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
