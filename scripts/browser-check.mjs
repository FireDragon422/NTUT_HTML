import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'tmp/browser');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
function assert(ok,label){results.push({label,passed:Boolean(ok)});if(!ok)errors.push(label)}
try{
 await page.goto(pathToFileURL(path.join(root,'slides/index.html')).href);
 const frozen=JSON.parse(fs.readFileSync(path.join(root,'workflow/runs/v2-outline/draft.json'),'utf8'));
 for(let i=0;i<frozen.length;i++){
  const s=frozen[i],texts=[s.title,s.subtitle,s.body,s.detail,...(s.items||[]).flat(),...(s.headers||[]),...(s.rows||[]).flat(),...(s.image?[s.image.caption,s.image.disclosure,...(s.image.labels||[])]:[]),...(s.sources||[]).map(m=>m.title)];
  const node=page.locator(`#slide-${i+1}`),actual=(await node.textContent()).replace(/\s/g,'');
  assert(texts.filter(Boolean).every(t=>actual.includes(t.replace(/\s/g,''))),`Frozen teaching text preserved slide ${i+1}`);
  if(s.questions)for(const [q,answers,,explanation] of s.questions){assert(actual.includes(q.replace(/\s/g,''))&&answers.every(a=>actual.includes(a.replace(/\s/g,'')))&&await node.locator('.question').evaluateAll((qs,e)=>qs.some(q=>q.dataset.explanation===e),explanation),'Frozen quiz and explanation preserved');}
 }
 assert(await page.locator('.teaching-figure img').count()===8,'Eight teaching image placements present');
 for(const img of await page.locator('.teaching-figure img').all()){
  assert(await img.evaluate(el=>el.complete&&el.naturalWidth>0&&el.alt.length>10),'Teaching image loaded with alt text');
 }
 assert(await page.locator('.slide:visible').count()===1,'Only one slide visible');
 await page.keyboard.press('ArrowRight');assert(await page.locator('#slide-2').isVisible(),'Keyboard next');
 await page.keyboard.press('Home');assert(await page.locator('#prev').isDisabled(),'Home and first-page boundary');
 await page.keyboard.press('End');assert(await page.locator('#next').isDisabled(),'End and last-page boundary');
 for(let i=0;i<15;i++){
  await page.locator('#jump').selectOption(String(i));
  assert(await page.locator(`#slide-${i+1}`).isVisible(),`Jump slide ${i+1}`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Desktop width slide ${i+1}`);
  await page.screenshot({path:path.join(out,`desktop-${String(i+1).padStart(2,'0')}.png`),fullPage:true});
 }
 await page.locator('#jump').selectOption('8');
 await page.locator('#thickness').fill('400');await page.locator('#thickness').dispatchEvent('input');
 assert(await page.locator('#time').textContent()==='4.0'&&await page.locator('#loss').textContent()==='20.0','Calculator 400 nm -> 4 min, 20 nm');
 await page.locator('#jump').selectOption('13');
 for(const q of await page.locator('.question').all()){
  await q.locator('button[data-correct="false"]').click();assert((await q.locator('.feedback').textContent()).startsWith('再想一下'),'Wrong answer feedback');
  await q.locator('button[data-correct="true"]').click();assert((await q.locator('.feedback').textContent()).startsWith('答對了'),'Correct answer feedback');
 }
 await page.emulateMedia({media:'print'});assert(await page.locator('.slide:visible').count()===15,'Print includes all 15 slides');
 await page.pdf({path:path.join(out,'print-check.pdf'),preferCSSPageSize:true,printBackground:true});
 await page.emulateMedia({media:'screen'});
 await page.setViewportSize({width:390,height:844});
 for(let i=0;i<15;i++){
  await page.locator('#jump').selectOption(String(i));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Mobile width slide ${i+1}`);
  await page.screenshot({path:path.join(out,`mobile-${String(i+1).padStart(2,'0')}.png`),fullPage:true});
 }
 await page.goto(pathToFileURL(path.join(root,'wiki/index.html')).href);
 await page.locator('#search').fill('RIE');assert(await page.locator('.wiki-article:visible').count()>0,'Wiki search matches');
 await page.locator('#search').fill('zzzz-no-result');assert(await page.locator('.empty-search').isVisible(),'Wiki no-result state');
 await page.locator('.wiki-side nav a').first().click();assert(await page.locator('#W01').isVisible(),'Wiki navigation clears search');
 await page.locator('#search').fill('');await page.setViewportSize({width:1440,height:900});
 await page.screenshot({path:path.join(out,'wiki.png'),fullPage:true});
 await page.goto(pathToFileURL(path.join(root,'workflow/graph.html')).href);await page.screenshot({path:path.join(out,'graph.png'),fullPage:true});
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.screenshot({path:path.join(out,'home.png'),fullPage:true});
}finally{await browser.close()}
const report={date:'2026-11-10',checks:results.length,passed:results.filter(x=>x.passed).length,errors,results};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks,passed:report.passed,errors},null,2));if(errors.length)process.exitCode=1;
