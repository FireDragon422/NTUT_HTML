import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('sources/manifest.json')),evidence=JSON.parse(read('sources/evidence.json')),slides=JSON.parse(read('slides/content.json'));
const errors=[],used=new Set();
if(manifest.length<5)errors.push('Need at least 5 sources');
for(const c of evidence){
 if(!c.references.length)errors.push(`No evidence ${c.id}`);
 for(const r of c.references){const m=manifest.find(m=>m.id===r.source);if(!m)errors.push(`Missing source ${r.source}`);else if(r.pdf_pages.some(n=>!Number.isInteger(n)||n<1||n>m.pages))errors.push(`Invalid page ${c.id}`);used.add(r.source)}
}
for(const m of manifest){if(!used.has(m.id)||!fs.existsSync(path.join(root,'sources',m.id+'.md')))errors.push(`Source not ingested ${m.id}`)}
for(const [i,s] of slides.entries()){
 const p=`wiki/${s.wiki}.md`;if(!fs.existsSync(path.join(root,p)))errors.push(`Missing Wiki slide ${i+1}`);
 else for(const id of s.claims){if(!evidence.some(e=>e.id===id)||!read(p).includes(id))errors.push(`Untraceable claim ${id} slide ${i+1}`)}
 if(!s.claims.length&&s.kind!=='sources')errors.push(`No slide evidence ${i+1}`);
}
let links=0,htmlFiles=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(['.git','tmp','node_modules'].includes(e.name))continue;const f=path.join(dir,e.name);
 if(e.isDirectory())walk(f);else if(e.name.endsWith('.html')){
  htmlFiles++;const text=fs.readFileSync(f,'utf8');
  if(!text.includes('lang="zh-Hant"'))errors.push(`Missing language ${f}`);
  for(const m of text.matchAll(/(?:href|src)="([^"]+)"/g)){
   const href=m[1];if(/^(https?:|mailto:|data:|javascript:)/.test(href))continue;
   links++;const [target,hash]=href.split('#');const dest=path.resolve(path.dirname(f),decodeURIComponent(target||path.basename(f)));
   if(!fs.existsSync(dest))errors.push(`Broken link ${path.relative(root,f)} -> ${href}`);
   else if(hash&&dest.endsWith('.html')&&!fs.readFileSync(dest,'utf8').includes(`id="${hash}"`))errors.push(`Missing anchor ${href}`);
  }
 }
}}
walk(root);
const report={date:'2026-11-10',sources:manifest.length,claims:evidence.length,slides:slides.length,htmlFiles,linksChecked:links,errors};
fs.mkdirSync(path.join(root,'tmp'),{recursive:true});fs.writeFileSync(path.join(root,'tmp/static-check.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
