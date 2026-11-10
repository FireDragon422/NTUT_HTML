import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
const require=createRequire(import.meta.url),{marked}=require('marked');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stateFile=path.join(root,'workflow/runs/v2-outline/state.json');
if(fs.existsSync(stateFile)){
 const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
 if(state.approval){
  if(!['ready_to_render','awaiting_presentation_check','complete'].includes(state.status))throw Error('新版內容尚未通過獨立審查，停止建置。');
  const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
  if(digest('slides/content.json')!==state.frozen['workflow/runs/v2-outline/draft.json'])throw Error('排版輸入與凍結逐頁稿不同。');
  for(const [p,h] of Object.entries(state.frozen))if(digest(p)!==h)throw Error('凍結輸入變更：'+p);
 }
}
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s+'\n');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body,css='../slides/style.css',scripts='')=>`<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="以五份教材建立的半導體製程 LLM Wiki 與零基礎教學簡報。"><title>${esc(title)}</title><link rel="stylesheet" href="${css}"></head><body>${body}${scripts}</body></html>`;
const header=(home='../index.html')=>`<header class="topbar"><a href="${home}">半導體製程 LLM Wiki</a><nav class="toolbar"><a href="${home.replace('index.html','slides/index.html')}">教學簡報</a></nav></header>`;
function markdown(text){return marked.parse(text).replace(/href="([^"#]+)\.md(#[^"]*)?"/g,(_,p,h='')=>`href="${p}.html${h}"`)}
for(const dir of ['sources','wiki','workflow','raw','.']){
 for(const f of fs.readdirSync(path.join(root,dir))){
  if(!f.endsWith('.md'))continue;
  const name=path.join(dir,f),title=read(name).split('\n')[0].replace(/^# /,'');
  write(name.replace(/\.md$/,'.html'),page(title,header(dir==='.'?'index.html':'../index.html')+`<main class="doc">${markdown(read(name))}</main>`,dir==='.'?'slides/style.css':'../slides/style.css'));
 }
}
const evidence=JSON.parse(read('sources/evidence.json')),manifest=JSON.parse(read('sources/manifest.json'));
write('sources/evidence.html',page('主張與來源頁碼',header()+`<main class="doc"><h1>主張與來源頁碼</h1><p>PDF 頁碼從 1 起算。書內頁碼另列。每個主張都能回到來源筆記。</p>${evidence.map(c=>`<section id="${c.id}"><h2>${c.id} ${esc(c.claim)}</h2><ul>${c.references.map(r=>`<li><a href="${r.source}.html">${r.source}</a>，PDF ${r.pdf_pages.join('、')}${r.printed_pages?`（書頁 ${r.printed_pages}）`:''}</li>`).join('')}</ul></section>`).join('')}</main>`));
const files=fs.readdirSync(path.join(root,'wiki')).filter(f=>/^W\d+\.md$/.test(f));
write('wiki/index.html',page('半導體製程 Wiki',header()+`<div class="wiki-layout"><aside class="wiki-side"><label for="search">搜尋 Wiki 內容</label><input id="search" type="search" placeholder="例如：選擇比、真空"><p id="search-status" role="status">共 ${files.length} 個條目</p><nav>${files.map(f=>`<a href="#${f.slice(0,3)}">${esc(read('wiki/'+f).split('\n')[0].replace('# ',''))}</a>`).join('')}</nav><a href="../sources/README.html">來源清單</a><a href="../sources/evidence.html">主張與頁碼</a></aside><main class="doc" id="articles"><h1>半導體製程 Wiki</h1><p>以概念為索引，讓每個解釋都能追溯到教材。</p>${files.map(f=>`<article class="wiki-article" id="${f.slice(0,3)}">${markdown(read('wiki/'+f)).replace(/<h1>/g,'<h2>').replace(/<\/h1>/g,'</h2>')}</article>`).join('')}<p class="empty-search" hidden>沒有符合的條目，試試「蝕刻」或「光阻」。</p></main></div>`,undefined,`<script>const input=document.querySelector('#search'),articles=[...document.querySelectorAll('.wiki-article')];input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();articles.forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(q));const n=articles.filter(a=>!a.hidden).length;document.querySelector('#search-status').textContent='找到 '+n+' 個條目';document.querySelector('.empty-search').hidden=n>0});document.querySelectorAll('.wiki-side nav a').forEach(a=>a.addEventListener('click',()=>{input.value='';input.dispatchEvent(new Event('input'))}));</script>`));
const slides=JSON.parse(read('slides/content.json'));
function figure(s){
 if(!s.image)return '';
 return `<figure class="teaching-figure ${s.image.layout==='wide'?'figure-wide':''}"><div class="figure-scroll"><a href="${esc(s.image.src)}" target="_blank" rel="noopener" aria-label="放大：${esc(s.image.alt)}"><img src="${esc(s.image.src)}" alt="${esc(s.image.alt)}" decoding="sync"></a>${s.image.labels?`<div class="figure-labels">${s.image.labels.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}</div><figcaption>${s.image.layout==='wide'?'<span class="swipe-hint">左右滑動圖片，查看完整四個步驟。</span>':''}${esc(s.image.caption)}<span class="figure-disclosure">${esc(s.image.disclosure)}</span></figcaption></figure>`;
}
function body(s){
 const prose=`${content(s)}${s.body?`<p class="lead">${esc(s.body)}</p>`:''}`;
 if(!s.image)return prose;
 if(s.image.layout==='wide')return figure(s)+`<div class="visual-prose">${prose}</div>`;
 return `<div class="visual-prose">${prose}</div>`+figure(s);
}
function content(s){
 if(s.kind==='terms')return `<div class="terms">${s.items.map(([a,b])=>`<div class="term"><b>${esc(a)}</b><p>${esc(b)}</p></div>`).join('')}</div>`;
 if(s.kind==='sequence')return `<div class="sequence">${s.items.map(([a,b])=>`<div class="step"><h3>${esc(a)}</h3><p>${esc(b)}</p></div>`).join('')}</div>`;
 if(s.kind==='compare')return `<table><thead><tr>${s.headers.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${s.rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 if(s.kind==='calculator')return s.calculatorMarkup;
 if(s.kind==='quiz'){
  const qs=s.questions;
  return `<div class="quiz">${qs.map(([q,a,correct,e])=>`<section class="question" data-explanation="${esc(e)}"><h3>${esc(q)}</h3><div class="answers">${a.map((x,i)=>`<button type="button" data-correct="${i===correct}" aria-pressed="false">${esc(x)}</button>`).join('')}</div><p class="feedback" role="status"></p></section>`).join('')}</div>`;
 }
 if(s.kind==='sources')return `<ol class="source-list">${s.sources.map(m=>`<li><a href="../sources/${m.id}.html">${m.id} ${esc(m.title)}</a></li>`).join('')}</ol>`;
 return '';
}
write('slides/index.html',page('晶片上的微小結構怎麼做出來？',`<a class="skip" href="#stage">跳到簡報內容</a><header class="topbar"><a class="brand" href="../index.html">半導體製程入門</a><nav class="toolbar"><a href="../wiki/index.html">閱讀 Wiki</a><button id="print" type="button">列印全部</button></nav></header><noscript><p class="noscript">JavaScript 未啟用，目前以連續頁面閱讀。啟用後可換頁、計算與測驗。</p></noscript><main class="stage" id="stage">${slides.map((s,i)=>`<section class="slide type-${s.kind}${s.image?` has-image image-${s.image.layout}`:s.hero?' has-hero':''}" id="slide-${i+1}" aria-label="第 ${i+1} 頁"><p class="eyebrow">${esc(s.subtitle)}</p><${i===0?'h1':'h2'}>${esc(s.title)}</${i===0?'h1':'h2'}><div class="body-content">${body(s)}</div><details class="detail" ${s.kind==='cover'?'open':''}><summary>補充說明</summary><p>${esc(s.detail)}</p></details><footer class="citation"><a href="../wiki/index.html#${s.wiki}">Wiki ${s.wiki}</a>${s.claims.map(c=>`<a href="../sources/evidence.html#${c}">${c}</a>`).join('')}${s.kind==='sources'?'<a href="../sources/README.html">來源與閱讀範圍</a>':''}</footer></section>`).join('')}</main><div class="progress" aria-hidden="true"><span id="progress"></span></div><nav class="nav" aria-label="簡報換頁"><div class="nav-group"><span class="page-count" id="count" role="status"></span><label for="jump" class="visually-hidden">選擇頁面</label><select id="jump">${slides.map((s,i)=>`<option value="${i}">${i+1}. ${esc(s.title.replace('\n',''))}</option>`).join('')}</select></div><div class="nav-group"><button id="prev" type="button" aria-label="上一頁">←</button><button id="next" type="button" aria-label="下一頁">→</button></div></nav>`,'style.css','<script src="app.js"></script>'));
const nodes=['討論並確認需求','盤點五份資料','可讀性、頁碼、缺圖檢查','Ingest 筆記與主張索引','內容與來源依賴檢查','整合 Wiki','查詢 Wiki 與大綱檢查','生成 HTML 簡報','瀏覽與引用檢查','執行報告與反思'];
const svg=`<svg viewBox="0 0 900 1050" role="img" aria-label="由需求確認到反思的十個節點，含來源、內容與版面退回路徑"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#144db5"/></marker></defs>${nodes.map((s,i)=>`<rect x="270" y="${20+i*100}" width="360" height="60" rx="6" fill="${[2,4,6,8].includes(i)?'#dbe7fb':'#edf0f1'}" stroke="#526574"/><text x="450" y="${57+i*100}" text-anchor="middle" font-size="22" fill="#152e40">${s}</text>${i<9?`<path d="M450,${80+i*100} V${116+i*100}" stroke="#144db5" stroke-width="2" marker-end="url(#arrow)"/>`:''}`).join('')}<g fill="none" stroke="#b94724" stroke-width="2"><path d="M270,250 H110 V150 H265" marker-end="url(#arrow)"/><path d="M630,450 H790 V250 H635" marker-end="url(#arrow)"/><path d="M270,650 H80 V350 H265" marker-end="url(#arrow)"/><path d="M630,850 H820 V550 H635" marker-end="url(#arrow)"/><path d="M270,850 H180 V750 H265" marker-end="url(#arrow)"/></g><g font-size="18" fill="#b94724"><text x="15" y="205">改讀影像、核頁碼</text><text x="650" y="330">矛盾：回原頁</text><text x="10" y="480">知識缺口：補 ingest</text><text x="645" y="690">內容錯誤：修 Wiki</text><text x="10" y="810">版面或操作：重生</text></g></svg>`;
write('workflow/graph.html',page('Workflow 流程圖',header()+`<main class="doc"><h1>取得資料到教學簡報</h1><p>藍色為順向流程，橘色為需要回頭檢查的路徑。</p>${svg}<p class="graph-caption">可讀性不通過時先修讀取方式；知識問題回來源或 Wiki；呈現問題回 HTML。每次退回留下紀錄。</p><p><a href="graph.md">Mermaid 原始流程與節點說明</a> · <a href="run-log.html">執行紀錄</a> · <a href="reflection.html">反思</a></p></main>`));
write('index.html',page('半導體製程 LLM Wiki',header('index.html')+`<main class="doc"><p class="eyebrow">LLM WIKI / SEMICONDUCTOR PROCESSING</p><h1>晶片上的微小結構<br>怎麼做出來？</h1><p class="lead">從薄膜、微影到蝕刻，理解晶片加工中的一段圖案轉移。</p><p>為零背景讀者整理。五份教材、七個知識條目與十五頁教學簡報，所有主張都能回到來源頁碼。</p><div class="home-links"><a href="slides/index.html">開始教學簡報</a><a href="wiki/index.html">探索 Wiki</a></div><h2>作業成果</h2><ul><li><a href="workflow/requirements.html">需求摘要</a></li><li><a href="AGENTS.html">AI 工作規則</a></li><li><a href="workflow/controlled-graph.html">Workflow／Graph 與 Loop</a></li><li><a href="workflow/check-report.html">實際執行檢查報告</a></li><li><a href="workflow/reflection.html">流程反思</a></li><li><a href="sources/README.html">五份來源與讀取範圍</a></li></ul><p>厚書採章節選讀，原始教材留在本機。內容用於基礎教學，未推論最新製程現況。</p></main>`,'slides/style.css'));
 write('workflow/graph.html',read('workflow/graph.html').replace('<main class="doc">','<main class="doc"><p><strong>此圖是第一版歷史流程。</strong>目前請看 <a href="controlled-graph.html">第二版 Graph 與 Loop</a>、<a href="outline-v2.html">待確認大綱</a>。</p>'));
 console.log(`Built ${slides.length} slides, ${files.length} wiki entries and ${manifest.length} source notes.`);
