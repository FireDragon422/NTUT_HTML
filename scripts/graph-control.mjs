import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir='workflow/runs/v2-outline/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const state=json(dir+'state.json'),events=json(dir+'events.json');
const need=(ok,msg)=>{if(!ok)throw Error(msg)};
const unchanged=map=>Object.entries(map).every(([p,h])=>fs.existsSync(path.join(root,p))&&hash(p)===h);
const command=process.argv[2];
try{
 need(hash(dir+'outline.json')===state.outline_sha256,'大綱版本變更，需重新確認');
 // content.json was the baseline retrieval input; after approval it becomes an output.
 if(command!=='refresh')need(unchanged(Object.fromEntries(Object.entries(state.inputs).filter(([p])=>p!=='slides/content.json'))),'知識來源已變更，需回查詢節點');
 if(command==='approve'){
  need(state.status==='awaiting_outline_confirmation','不在待確認關卡');
  need(process.argv[3]?.trim(),'需記錄使用者實際確認原文');
  need(unchanged(state.inputs),'初版輸入已變更');
  fs.copyFileSync(path.join(root,'slides/content.json'),path.join(root,dir+'baseline-content.json'));
  state.approval={quote:process.argv[3],date:new Date().toISOString(),outline_sha256:state.outline_sha256};
  state.status='drafting';
 }else if(command==='refresh'){
  need(state.status==='revision_required','只有審查退回可以更新來源索引');
  need(process.argv[3]?.trim(),'需記錄來源修訂原因');
  const previous={...state.inputs};
  for(const p of Object.keys(state.inputs))if(p!=='slides/content.json')state.inputs[p]=hash(p);
  write(dir+'retrieval-revision.json',{reason:process.argv[3],previous,current:state.inputs});
  for(const id of ['S01','S02','S03','S04','S05']){const p=dir+'cards/'+id+'.json',card=json(p);card.note=read('sources/'+id+'.md');write(p,card);}
  state.independent_review=null;
 }else if(command==='freeze'){
  need(state.approval&&['drafting','revision_required'].includes(state.status),'需先確認大綱，或有審查退回');
  const draft=json(dir+'draft.json'),outline=json(dir+'outline.json');
  need(draft.length===outline.length,'頁數與大綱不符');
  draft.forEach((s,i)=>need(s.wiki===outline[i].wiki&&outline[i].claims.every(c=>s.claims.includes(c))&&s.claims.every(c=>read(`wiki/${s.wiki}.md`).includes(c)),'頁面引用與大綱或 Wiki 不符'));
  state.revisions??=0;
  if(state.status==='revision_required'){state.revisions++;need(state.revisions<=2,'修訂已達上限，停止並請求決策');}
  const assets=[...new Set(draft.filter(s=>s.image).map(s=>'slides/'+s.image.src))];
  state.frozen=Object.fromEntries([dir+'draft.json',...assets].map(p=>[p,hash(p)]));
  state.status='awaiting_independent_review';
 }else if(command==='review'){
  need(state.status==='awaiting_independent_review','不在獨立審查節點');
  need(unchanged(state.frozen),'稿件或圖像已變更，需重新凍結');
  const report=json(process.argv[3]);
  need(report.draft_sha256===hash(dir+'draft.json')&&report.independent===true&&Array.isArray(report.issues),'審查格式或版本不符');
  need(['pass','revise'].includes(report.verdict),'缺少審查結論');
  need(report.verdict!=='pass'||!report.issues.some(i=>i.blocking),'有阻擋問題不可通過');
  state.independent_review={path:process.argv[3],sha256:hash(process.argv[3]),verdict:report.verdict};
  state.status=report.verdict==='pass'?'ready_to_render':'revision_required';
 }else if(command==='render'){
  need(state.status==='ready_to_render','審查尚未通過，不可排版');
  need(unchanged(state.frozen),'凍結內容已變更，審查失效');
  need(hash(state.independent_review.path)===state.independent_review.sha256,'審查紀錄被改動');
  fs.copyFileSync(path.join(root,dir+'draft.json'),path.join(root,'slides/content.json'));
  execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'inherit'});
  state.rendered=Object.fromEntries(['slides/index.html','slides/content.json','slides/app.js','slides/style.css','scripts/build.mjs'].map(p=>[p,hash(p)]));
  state.status='awaiting_presentation_check';
 }else if(command==='complete'){
  need(state.status==='awaiting_presentation_check','不在呈現檢查節點');
  need(unchanged(state.frozen)&&unchanged(state.rendered),'成品或稿件已變更，需重跑檢查');
  const checks=json(dir+'presentation-check.json');
  need(checks.html_sha256===hash('slides/index.html')&&checks.passed===true&&checks.print_pages===15&&checks.visual_inspected===true,'呈現檢查缺失或版本不符');
  state.status='complete';
 }else throw Error('命令：approve、freeze、review、render、complete');
 events.push({time:new Date().toISOString(),event:command,status:state.status});
 state.executed=[...new Set([...state.executed,command])];
 state.not_executed=state.status==='complete'?[]:state.not_executed;
 write(dir+'state.json',state);write(dir+'events.json',events);console.log(state.status);
}catch(e){console.error(e.message);process.exitCode=1;}
