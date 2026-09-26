import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Scan } from 'lucide-react';
const icons = Object.fromEntries(Object.entries({ back:ArrowLeft, previous:ChevronLeft, next:ChevronRight, in:ZoomIn, out:ZoomOut, reset:Scan }).map(([key, icon])=>[key,renderToStaticMarkup(createElement(icon,{size:20,strokeWidth:1.75,'aria-hidden':true}))]));
await build({entryPoints:['viewer.ts'],bundle:true,format:'iife',minify:true,outfile:'image-preview.js',define:{VIEWER_ICONS:JSON.stringify(icons)},legalComments:'eof'});
await build({entryPoints:['../../scripts/install-image-preview.ts'],bundle:true,platform:'node',format:'cjs',outfile:'../../scripts/install-image-preview.cjs'});
await copyFile('node_modules/@panzoom/panzoom/MIT-License.txt','panzoom-license.txt');
