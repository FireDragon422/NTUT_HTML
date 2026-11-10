import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=path.join(root,'workflow/runs/v2-outline');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const command=process.argv[2]||'status';
const fail=m=>{console.error(m);process.exitCode=1;};
if(command==='prepare'){
 if(fs.existsSync(run)) fail('已存在執行紀錄；停止，避免覆寫或重設修訂次數。');
 else {
  const slides=JSON.parse(read('slides/content.json'));
  const evidence=JSON.parse(read('sources/evidence.json'));
  const manifest=JSON.parse(read('sources/manifest.json'));
  const files=[...new Set(slides.map(s=>`wiki/${s.wiki}.md`))];
  const claims=[...new Set(slides.flatMap(s=>s.claims))];
  const inputs=Object.fromEntries([...files,'sources/evidence.json','sources/manifest.json','slides/content.json',...manifest.map(s=>`sources/${s.id}.md`)].map(p=>[p,hash(read(p))]));
  const used=evidence.filter(c=>claims.includes(c.id));
  const coverage=['W02','W03','W04'].every(w=>files.includes(`wiki/${w}.md`))&&manifest.length>=5&&manifest.every(s=>used.some(c=>c.references.some(r=>r.source===s.id)));
  if(!coverage) fail('來源或薄膜／微影／蝕刻覆蓋不足；停止生成。');
  else if(slides.some(s=>s.claims.some(id=>!read(`wiki/${s.wiki}.md`).includes(id)||!used.some(c=>c.id===id)))) fail('Wiki 未包含採用主張；停止生成。');
  else {
   fs.mkdirSync(path.join(run,'cards'),{recursive:true});
   const write=(p,v)=>fs.writeFileSync(path.join(run,p),JSON.stringify(v,null,2)+'\n');
   write('retrieval.json',{method:'讀取既有 Wiki，依第一版已確認主題查詢與覆蓋檢查；非重新 ingest',files,claims,coverage,inputs});
   for(const source of manifest) write(`cards/${source.id}.json`,{source:source.id,kind:'來源筆記與引用定位卡；待獨立審查',note:read(`sources/${source.id}.md`),references:used.filter(c=>c.references.some(r=>r.source===source.id)).map(c=>({claim_id:c.id,locator_only:true,references:c.references.filter(r=>r.source===source.id)}))});
   const visuals=['晶圓封面','晶圓與裸晶放大圖','四步圖案轉移圖','薄膜分層剖面','CVD／PVD 對照表','沿用圖案轉移圖，聚焦光阻','沿用圖案轉移圖，聚焦材料移除','方向性與選擇比示意','假設數值滑桿','濕式／乾式比較表','RIE 剖面圖','壓力與碰撞概念圖（待製作）','品質檢查清單','測驗與解說','來源清單與選讀範圍'];
   const outline=slides.map((s,i)=>({page:i+1,title:s.title.replaceAll('\n',''),objective:s.subtitle||s.title,wiki:s.wiki,claims:s.claims,cards:[...new Set(used.filter(c=>s.claims.includes(c.id)).flatMap(c=>c.references.map(r=>r.source)))],visual:visuals[i]}));
   write('outline.json',outline);
   write('state.json',{status:'awaiting_outline_confirmation',created:new Date().toISOString(),outline_sha256:hash(JSON.stringify(outline,null,2)+'\n'),inputs,approval:null,independent_review:null,revision_limit:2,executed:['retrieval','coverage','source_note_cards','outline'],not_executed:['human_approval','draft','independent_review','render','presentation_check']});
   write('events.json',[{time:new Date().toISOString(),event:'prepared',result:'coverage passed; paused at human outline gate'}]);
   fs.writeFileSync(path.join(root,'workflow/outline-v2.md'),'# 第二版大綱：待確認\n\n保留目前十五頁方向。這份大綱是新流程的人工關卡，尚未產生第二版逐頁稿。圖片皆為教學示意，非實際比例；新圖須核對來源與材料邊界。\n\n| 頁 | 主題 | 教學目的 | 視覺安排 | Wiki／主張 |\n| --- | --- | --- | --- | --- |\n'+outline.map(s=>`| ${s.page} | ${s.title} | ${s.objective} | ${s.visual} | ${s.wiki}／${s.claims.join('、')||'來源說明'} |`).join('\n')+'\n\n第 12 頁新增真空概念圖；第 6–7 頁把既有四步圖重用於單步講解，讓空間與加工步驟都有圖可對照。維持先看圖案轉移，再補真空原理的順序。\n\n使用者確認後才進行逐頁稿；若要調整順序或範圍，先修改大綱並重新確認。來源卡只是既有來源筆記的分拆，不計為新的五份 ingest。\n');
   console.log('覆蓋檢查通過；五份來源卡與十五頁大綱已建立；停於大綱確認。');
  }
 }
}else if(command==='status'){
 if(!fs.existsSync(run)) fail('尚未執行 prepare');
 else {const state=JSON.parse(fs.readFileSync(path.join(run,'state.json'),'utf8'));const inputs={...state.inputs};if(state.approval)delete inputs['slides/content.json'];const stale=Object.entries(inputs).filter(([p,h])=>!fs.existsSync(path.join(root,p))||hash(read(p))!==h).map(([p])=>p);const outlineChanged=hash(fs.readFileSync(path.join(run,'outline.json')))!==state.outline_sha256;console.log(JSON.stringify({status:state.status,approval:state.approval,stale_inputs:stale,outline_changed:outlineChanged},null,2));if(stale.length||outlineChanged) process.exitCode=1;}
}else fail('停止：目前僅開放 prepare 與 status；尚未取得此版大綱確認，不得跳到逐頁稿或排版。');
