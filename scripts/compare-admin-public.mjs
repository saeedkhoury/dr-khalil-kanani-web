#!/usr/bin/env node
/**
 * THE SAME-WEBSITE TEST.
 *
 * Edit Mode is meant to BE the website, not a dashboard that resembles it.
 * The only honest way to hold that line is mechanically: strip the editor
 * chrome from every admin page and require what remains to equal the public
 * page exactly.
 *
 * If this fails, the admin build has drifted into a separate design — which
 * is the failure mode the whole product exists to avoid.
 *
 * Run after building both:
 *   npm run build && npm run build:admin && node scripts/compare-admin-public.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const PUB='dist', ADM='workers/admin/dist';
const walk=(d,o=[])=>{for(const e of readdirSync(d)){const f=join(d,e);statSync(f).isDirectory()?walk(f,o):f.endsWith('.html')&&o.push(f);}return o;};
const body=(h)=>(h.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1]??h);
/** Remove Edit Mode chrome, including the wrapper it is placed in. */
function strip(html){
  let s = body(html)
    .replace(/<div class="visual-editor-bar"[\s\S]*?<\/div>\s*(?=<)/g,'')
    .replace(/<(button|a)[^>]*class="visual-edit-control"[^>]*>[\s\S]*?<\/\1>/g,'')
    .replace(/\s*data-edit-(kind|focus)="[^"]*"/g,'')
    .replace(/\s*data-visual-editor-locale="[^"]*"/g,'')
    .replace(/<script src="\/visual-editor\.js"[^>]*><\/script>/g,'')
    .replace(/https:\/\/admin\.drkhalilkanani\.com/g,'https://www.drkhalilkanani.com');
  // The control sits inside its own wrapper; once removed the wrapper is empty.
  let before; do { before = s; s = s.replace(/<div class="[^"]*"><\/div>/g,'').replace(/<div><\/div>/g,''); } while (s !== before);
  return s.replace(/\s+/g,' ').trim();
}
let same=0; const diff=[];
for(const file of walk(PUB)){
  const rel=relative(PUB,file);
  let a; try{a=readFileSync(join(ADM,rel),'utf8');}catch{diff.push([rel,'missing in admin']);continue;}
  const A=strip(a), P=strip(readFileSync(file,'utf8'));
  if(A===P) same++; else {let i=0;while(i<Math.min(A.length,P.length)&&A[i]===P[i])i++;diff.push([rel,`@${i} public«${P.slice(i,i+100)}» admin«${A.slice(i,i+100)}»`]);}
}
const total = same + diff.length;
if (diff.length === 0) {
  console.log(`\x1b[32m✓ admin matches the public site on all ${total} page(s), editor chrome aside.\x1b[0m`);
  process.exit(0);
}
console.log(`\x1b[31m✗ ${diff.length} of ${total} admin page(s) differ from the public site beyond editor chrome.\x1b[0m`);
for (const [f, w] of diff.slice(0, 5)) console.log(`  ${f}\n    ${w}`);
process.exit(1);
