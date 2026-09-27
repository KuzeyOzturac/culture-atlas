const $=id=>document.getElementById(id),key='culture-atlas-v1';
const demo=[{id:'a',name:'Highlanders',parents:[],notes:'Fictional example culture. Edit or delete these nodes to build your own atlas.'},{id:'b',name:'Coastfolk',parents:[],notes:'Fictional example culture.'},{id:'c',name:'Valefolk',parents:['a']},{id:'d',name:'Islefolk',parents:['b']},{id:'e',name:'Estuary culture',parents:['a','b'],notes:'A fictional hybrid with two parent cultures.'},{id:'f',name:'New Estuary',parents:['e']}].map(n=>({flag:'',notes:'',...n}));
let data=structuredClone(demo),selected='e',editing=null,positions={},view={x:30,y:100,s:1};
function validate(arr){if(!Array.isArray(arr)||arr.length>2000)throw Error('Provide an array of up to 2,000 cultures.');const ids=new Set();for(const n of arr){if(!n||typeof n.id!=='string'||ids.has(n.id)||typeof n.name!=='string'||!n.name.trim()||n.name.length>80||!Array.isArray(n.parents)||n.parents.length>2||new Set(n.parents).size!==n.parents.length)throw Error('Each culture needs a unique ID, a name, and at most two distinct parents.');ids.add(n.id);if(n.flag&&(typeof n.flag!=='string'||!/^https:\/\//i.test(n.flag)))throw Error('Flag links must start with https://.');if(n.notes!=null&&typeof n.notes!=='string')throw Error('Notes must be text.');}const map=new Map(arr.map(n=>[n.id,n])),visiting=new Set(),done=new Set();function walk(id){if(visiting.has(id))throw Error('This relationship creates an ancestry cycle.');if(done.has(id))return;if(!map.has(id))throw Error('A parent culture is missing.');visiting.add(id);map.get(id).parents.forEach(walk);visiting.delete(id);done.add(id);}arr.forEach(n=>walk(n.id));return arr;}
try{const saved=localStorage.getItem(key);if(saved)data=validate(JSON.parse(saved));}catch(e){$('saveState').textContent='Saved data unavailable';}
selected=data.some(n=>n.id===selected)?selected:data[0]?.id;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=id=>data.find(n=>n.id===id),kind=n=>n.parents.length===2?'Hybridized':n.parents.length===1?'Diverged':'Root culture';
function flag(n,big=''){return n.flag?`<img class="flag ${big}" src="${esc(n.flag)}" alt="${esc(n.name)} flag" referrerpolicy="no-referrer"><span class="flag fallback ${big}" hidden>${esc(n.name.slice(0,1))}</span>`:`<span class="flag fallback ${big}">${esc(n.name.slice(0,1))}</span>`;}
function brokenImages(){document.querySelectorAll('img.flag').forEach(im=>{im.onerror=()=>{im.style.display='none';im.nextElementSibling.hidden=false;};});}
function save(){try{localStorage.setItem(key,JSON.stringify(data));$('saveState').textContent='Saved on this device';}catch{$('saveState').textContent='Not saved — export a backup';notify('Device storage unavailable. Export JSON to keep your changes.');}}
let toastTimer;function notify(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3500);}
function layout(){positions={};const levels=new Map();function level(id){if(levels.has(id))return levels.get(id);const n=get(id),l=n.parents.length?1+Math.max(...n.parents.map(level)):0;levels.set(id,l);return l;}data.forEach(n=>level(n.id));const rows=[];data.forEach(n=>(rows[levels.get(n.id)]??=[]).push(n));const width=Math.max(1,...rows.map(r=>r.length))*225;rows.forEach((r,l)=>r.forEach((n,i)=>positions[n.id]={x:(width-r.length*225)/2+i*225,y:l*165}));}
function renderList(){const q=$('search').value.toLowerCase(),items=data.filter(n=>n.name.toLowerCase().includes(q));$('count').textContent=`${items.length} CULTURES`;$('list').innerHTML=items.map(n=>`<button class="list-item ${n.id===selected?'active':''}" data-select="${esc(n.id)}">${flag(n)}<span>${esc(n.name)}</span></button>`).join('')||'<p class="muted">No cultures found.</p>';brokenImages();}
function render(){layout();renderList();$('summary').textContent=`${data.length} cultures · ${data.reduce((s,n)=>s+n.parents.length,0)} connections`;$('empty').hidden=!!data.length;$('nodes').innerHTML=data.map(n=>{const p=positions[n.id];return `<button class="node ${n.id===selected?'selected':''} ${n.parents.length===2?'hybrid-node':''}" style="left:${p.x}px;top:${p.y}px" data-select="${esc(n.id)}" aria-label="${esc(n.name)}, ${kind(n)}">${flag(n)}<span><strong>${esc(n.name)}</strong><small>${kind(n)}</small></span></button>`;}).join('');$('edges').innerHTML=data.flatMap(n=>n.parents.map(id=>{const p=positions[id],c=positions[n.id],x=p.x+92,y=p.y+83,xx=c.x+92,yy=c.y;return `<path d="M${x},${y} C${x},${y+42} ${xx},${yy-42} ${xx},${yy}" fill="none" stroke="${n.parents.length===2?'#b89ee8':'#83bd98'}" stroke-width="2"/><circle cx="${xx}" cy="${yy}" r="3" fill="${n.parents.length===2?'#b89ee8':'#83bd98'}"/>`;})).join('');renderDetails();brokenImages();transform();refreshRelation();}
function renderDetails(){const n=get(selected);if(!n){$('details').innerHTML='<div class="section-label">CULTURE DETAILS</div><h2>Your next lineage</h2><p class="muted">Add a culture or select one in the graph to explore its origins.</p>';return;}const children=data.filter(c=>c.parents.includes(n.id));const rel=arr=>arr.map(c=>`<button class="relation" data-select="${esc(c.id)}">${esc(c.name)} <span aria-hidden="true">↗</span></button>`).join('');$('details').innerHTML=`<div class="section-label">CULTURE DETAILS</div>${flag(n,'big')}<h2>${esc(n.name)}</h2><span class="badge">${kind(n)}</span><h3>PARENTS · ${n.parents.length}</h3>${rel(n.parents.map(get))||'<p class="muted">An independent root.</p>'}<h3>DIRECT DESCENDANTS · ${children.length}</h3>${rel(children)||'<p class="muted">No descendants yet.</p>'}${n.notes?`<h3>NOTES</h3><p class="notes">${esc(n.notes)}</p>`:''}<div class="detail-actions"><button class="primary" id="branch">+ Add descendant</button><button id="edit">Edit culture</button><button class="danger" id="delete">Delete culture</button></div>`;$('branch').onclick=()=>openEditor(null,n.id);$('edit').onclick=()=>openEditor(n.id);$('delete').onclick=()=>{if(!confirm(`Delete ${n.name}? ${children.length?'It will also be removed from its children’s parent lists. Their relationship types may change.':'This cannot be undone.'}`))return;data=data.filter(c=>c.id!==n.id).map(c=>({...c,parents:c.parents.filter(id=>id!==n.id)}));selected=data[0]?.id;save();render();};}
function transform(){$('world').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.s})`;$('zoom').textContent=Math.round(view.s*100)+'%';}
function fit(){if(!data.length)return;const w=$('canvas').clientWidth,h=$('canvas').clientHeight,maxX=Math.max(...Object.values(positions).map(p=>p.x+184)),maxY=Math.max(...Object.values(positions).map(p=>p.y+83));view.s=Math.min(1.2,Math.max(.08,Math.min((w-70)/maxX,(h-145)/maxY)));view.x=(w-maxX*view.s)/2;view.y=75+(h-145-maxY*view.s)/2;transform();}
function select(id){selected=id;render();const p=positions[id];if(p){view.x=$('canvas').clientWidth/2-(p.x+92)*view.s;view.y=$('canvas').clientHeight/2-(p.y+41)*view.s;transform();}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-select]');if(b)select(b.dataset.select);});
function openEditor(id=null,parent=null){editing=id;const n=get(id);$('formTitle').textContent=n?'Edit culture':'Add culture';$('name').value=n?.name||'';$('flag').value=n?.flag||'';$('notes').value=n?.notes||'';$('error').textContent='';const excluded=new Set(id?[id]:[]);let change=true;while(change){change=false;data.forEach(c=>{if(!excluded.has(c.id)&&c.parents.some(p=>excluded.has(p))){excluded.add(c.id);change=true;}});}const opts='<option value="">No parent</option>'+data.filter(c=>!excluded.has(c.id)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('parent1').innerHTML=opts;$('parent2').innerHTML=opts;$('parent1').value=n?.parents[0]||parent||'';$('parent2').value=n?.parents[1]||'';$('editor').showModal();$('name').focus();}
$('form').onsubmit=e=>{e.preventDefault();try{const n={id:editing||crypto.randomUUID(),name:$('name').value.trim(),flag:$('flag').value.trim(),notes:$('notes').value.trim(),parents:[$('parent1').value,$('parent2').value].filter(Boolean)},next=editing?data.map(c=>c.id===editing?n:c):[...data,n];validate(next);data=next;selected=n.id;save();$('editor').close();render();fit();}catch(err){$('error').textContent=err.message;}};
$('add').onclick=()=>openEditor();$('cancel').onclick=()=>$('editor').close();$('search').oninput=renderList;$('fit').onclick=fit;
function zoom(f,x=$('canvas').clientWidth/2,y=$('canvas').clientHeight/2){const s=Math.max(.08,Math.min(2.5,view.s*f)),ratio=s/view.s;view.x=x-(x-view.x)*ratio;view.y=y-(y-view.y)*ratio;view.s=s;transform();}
$('in').onclick=()=>zoom(1.2);$('out').onclick=()=>zoom(1/1.2);$('canvas').addEventListener('wheel',e=>{e.preventDefault();const r=$('canvas').getBoundingClientRect();zoom(Math.exp(-e.deltaY*.001),e.clientX-r.left,e.clientY-r.top);},{passive:false});let drag;
$('canvas').onpointerdown=e=>{if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};$('canvas').setPointerCapture(e.pointerId);};$('canvas').onpointermove=e=>{if(drag){view.x=drag.vx+e.clientX-drag.x;view.y=drag.vy+e.clientY-drag.y;transform();}};$('canvas').onpointerup=$('canvas').onpointercancel=()=>drag=null;
$('canvas').onkeydown=e=>{if(e.target!==$('canvas'))return;const moves={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(moves[e.key]){e.preventDefault();view.x+=moves[e.key][0];view.y+=moves[e.key][1];transform();}if(e.key==='+'||e.key==='=')zoom(1.2);if(e.key==='-')zoom(1/1.2);};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,cultures:data},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='culture-atlas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('import').onclick=()=>$('file').click();$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5e6)throw Error('Please choose a JSON file smaller than 5 MB.');const parsed=JSON.parse(await f.text()),next=validate(Array.isArray(parsed)?parsed:parsed.cultures);if(!confirm('Replace the current atlas with this file? Export first if you want to keep the current tree.'))return;data=next;selected=data[0]?.id;save();render();fit();notify('Atlas imported');}catch(err){notify('Import failed: '+err.message);}finally{e.target.value='';}};
render();requestAnimationFrame(fit);window.addEventListener('resize',fit);

function shortestRelation(cultures,start,end){
 const adjacency=new Map(cultures.map(n=>[n.id,[]]));
 if(!adjacency.has(start)||!adjacency.has(end))return null;
 cultures.forEach(n=>n.parents.forEach(p=>{adjacency.get(n.id).push(p);adjacency.get(p).push(n.id);}));
 const queue=[start],previous=new Map([[start,null]]);
 for(let i=0;i<queue.length;i++){
  const id=queue[i];
  if(id===end){const path=[];for(let cursor=end;cursor!==null;cursor=previous.get(cursor))path.push(cursor);return path.reverse();}
  for(const neighbor of adjacency.get(id)){if(!previous.has(neighbor)){previous.set(neighbor,id);queue.push(neighbor);}}
 }
 return null;
}
function refreshRelation(){
 const a=$('cultureA').value,b=$('cultureB').value;
 const options=data.map(n=>`<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');
 $('cultureA').innerHTML=options;$('cultureB').innerHTML=options;
 $('cultureA').value=get(a)?a:(selected||data[0]?.id||'');
 $('cultureB').value=get(b)?b:(data.find(n=>n.id!==$('cultureA').value)?.id||data[0]?.id||'');
 $('cultureA').disabled=$('cultureB').disabled=!data.length;
 showRelation();
}
function showRelation(){
 if(!data.length){$('relationResult').innerHTML='<p class="muted">Add cultures to calculate their relation degree.</p>';return;}
 const path=shortestRelation(data,$('cultureA').value,$('cultureB').value);
 if(!path){$('relationResult').innerHTML='<h3>No connection</h3><p class="muted">These cultures belong to disconnected lineages.</p>';return;}
 const degree=path.length-1;
 $('relationResult').innerHTML=`<div class="degree-value">${degree}<span>${degree===1?'degree':'degrees'} of separation</span></div><p class="hint">${degree===0?'Same culture.':degree===1?'Direct parent–child relationship.':'Shortest path through parent–child links.'}</p><ol class="relation-path">${path.map(id=>`<li><button data-select="${esc(id)}">${esc(get(id).name)}</button></li>`).join('')}</ol>`;
}
$('degree').onclick=()=>{refreshRelation();$('relationDialog').showModal();};
$('closeRelation').onclick=()=>$('relationDialog').close();
$('cultureA').onchange=$('cultureB').onchange=showRelation;
$('relationResult').addEventListener('click',e=>{if(e.target.closest('[data-select]'))$('relationDialog').close();});
$('clear').onclick=()=>{
 if(!data.length){notify('The graph is already empty.');return;}
 $('clearDialog').showModal();
};

$('cancelClear').onclick=()=>$('clearDialog').close();
$('confirmClear').onclick=()=>{data=[];selected=undefined;editing=null;save();render();$('clearDialog').close();notify('Graph cleared');};
