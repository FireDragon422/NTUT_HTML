(() => {
 const slides=[...document.querySelectorAll('.slide')];
 const jump=document.querySelector('#jump'), count=document.querySelector('#count');
 let current=0;
 function show(index,updateHash=true){
  current=Math.max(0,Math.min(slides.length-1,index));
  slides.forEach((s,i)=>s.hidden=i!==current);
  jump.value=String(current);count.textContent=`${String(current+1).padStart(2,'0')} / ${slides.length}`;
  document.querySelector('#prev').disabled=current===0;
  document.querySelector('#next').disabled=current===slides.length-1;
  document.querySelector('#progress').style.width=`${(current+1)/slides.length*100}%`;
  if(updateHash) history.replaceState(null,'',`#slide-${current+1}`);
  document.title=`${current+1}. ${slides[current].querySelector('h1,h2').textContent}｜半導體製程入門`;
  window.scrollTo(0,0);
 }
 function fromHash(){const n=Number(location.hash.replace('#slide-',''));show(Number.isInteger(n)&&n>0?n-1:0,false)}
 document.querySelector('#prev').addEventListener('click',()=>show(current-1));
 document.querySelector('#next').addEventListener('click',()=>show(current+1));
 jump.addEventListener('change',()=>show(Number(jump.value)));
 window.addEventListener('hashchange',fromHash);
 document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
  if(['ArrowRight','PageDown','ArrowLeft','PageUp','Home','End'].includes(event.key)){
   event.preventDefault();show(event.key==='Home'?0:event.key==='End'?slides.length-1:current+(['ArrowRight','PageDown'].includes(event.key)?1:-1));
  }
 });
 const details=[...document.querySelectorAll('details')];let printState=[];
 window.addEventListener('beforeprint',()=>{printState=details.map(d=>d.open);details.forEach(d=>d.open=true)});
 window.addEventListener('afterprint',()=>details.forEach((d,i)=>d.open=printState[i]));
 document.querySelector('#print').addEventListener('click',()=>window.print());
 const thickness=document.querySelector('#thickness');
 function calculate(){const nm=Number(thickness.value);document.querySelector('#thickness-value').textContent=`${nm} nm`;document.querySelector('#time').textContent=(nm/100).toFixed(1);document.querySelector('#loss').textContent=(nm/100*5).toFixed(1)}
 thickness.addEventListener('input',calculate);calculate();
 document.querySelectorAll('.question').forEach(q=>{
  q.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
   q.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   q.querySelector('.feedback').textContent=(button.dataset.correct==='true'?'答對了。':'再想一下。')+q.dataset.explanation;
  }));
 });
 fromHash();
})();
