// Country assignments and descendant aggregation are independent of graph layout.
const countryLookup=new Map(MAP_COUNTRIES.map(c=>[c.id,c]));
let countryChoice=new Set(),mapBox=[0,0,1080,540],mapDragging=null,territorySelection={direct:new Set(),inherited:new Set(),all:new Set()},mapRendered=false;
function aggregateCountries(cultures,selectedId){
 const byId=new Map(cultures.map(c=>[c.id,c]));
 const direct=new Set(byId.get(selectedId)?.countries||[]),all=new Set(direct),children=new Map();
 cultures.forEach(c=>c.parents.forEach(p=>{if(!children.has(p))children.set(p,[]);children.get(p).push(c.id);}));
 const visited=new Set(),queue=byId.has(selectedId)?[selectedId]:[];
 for(let i=0;i<queue.length;i++){const id=queue[i];if(visited.has(id))continue;visited.add(id);(byId.get(id)?.countries||[]).forEach(c=>all.add(c));(children.get(id)||[]).forEach(c=>queue.push(c));}
 return {direct,inherited:new Set([...all].filter(c=>!direct.has(c))),all};
}
function openCountryPicker(ids){countryChoice=new Set(ids);$('countrySearch').value='';renderCountryOptions();}
function readCountryPicker(){return [...countryChoice];}
function renderCountryOptions(){
 const q=$('countrySearch').value.trim().toLocaleLowerCase();
 $('countrySelection').textContent=`${countryChoice.size} assigned directly`;
 const matches=MAP_COUNTRIES.filter(c=>c.name.toLocaleLowerCase().includes(q));
 $('countryOptions').innerHTML=matches.map(c=>`<label class="country-option"><input type="checkbox" value="${esc(c.id)}" ${countryChoice.has(c.id)?'checked':''}><span>${esc(c.name)}</span></label>`).join('')||'<p class="hint">No matching countries.</p>';
}
function renderTerritories(){
 if(!mapRendered){$('countryPaths').innerHTML=MAP_COUNTRIES.map(c=>`<path data-country="${esc(c.id)}" d="${c.path}" fill-rule="evenodd" vector-effect="non-scaling-stroke"><title>${esc(c.name)}</title></path>`).join('');mapRendered=true;}
 territorySelection=aggregateCountries(data,selected);
 const n=get(selected),{direct,inherited,all}=territorySelection;
 $('mapTitle').textContent=n?n.name:'Select a culture';
 $('mapStatus').textContent=!n?'Select a culture to see its countries.':all.size?`${all.size} highlighted · ${direct.size} direct · ${inherited.size} from descendants`:'No countries assigned to this culture or its descendants. Use Edit culture to assign countries.';
 $('mapFocus').disabled=!all.size;
 $('countryPaths').querySelectorAll('[data-country]').forEach(path=>{const id=path.dataset.country;path.classList.toggle('direct-country',direct.has(id));path.classList.toggle('inherited-country',inherited.has(id));path.querySelector('title').textContent=countryLookup.get(id).name+(direct.has(id)?' — assigned directly':inherited.has(id)?' — from descendants':'');});
 if(n){
  const panel=document.createElement('div');panel.className='country-details';
  panel.innerHTML=`<h3>COUNTRIES · ${all.size}</h3>${all.size?`<div class="country-chips">${[...all].sort((a,b)=>countryLookup.get(a).name.localeCompare(countryLookup.get(b).name)).map(id=>`<button class="country-chip ${direct.has(id)?'direct':'inherited'}" data-focus-country="${esc(id)}">${esc(countryLookup.get(id).name)}<small>${direct.has(id)?'Direct':'Descendant'}</small></button>`).join('')}</div>`:'<p class="muted">Assign countries in Edit culture.</p>'}`;
  $('details').querySelector('.detail-actions')?.before(panel);
 }
 drawMapLabels();
}
function applyMapBox(){ $('countryMap').setAttribute('viewBox',mapBox.join(' '));drawMapLabels(); }
function drawMapLabels(){
 const rect=$('mapViewport').getBoundingClientRect();if(rect.width<1||rect.height<1)return;const unit=Math.max(mapBox[2]/Math.max(rect.width,1),mapBox[3]/Math.max(rect.height,1)),font=12*unit;
 const visible=MAP_COUNTRIES.filter(c=>{const [x,y]=c.center;return x>mapBox[0]&&x<mapBox[0]+mapBox[2]&&y>mapBox[1]&&y<mapBox[1]+mapBox[3]&&(territorySelection.all.has(c.id)||(mapBox[2]<180&&(c.bounds[2]-c.bounds[0])/unit>45&&(c.bounds[3]-c.bounds[1])/unit>30));});
 $('countryLabels').innerHTML=visible.slice(0,60).map(c=>`<text x="${c.center[0]}" y="${c.center[1]}" font-size="${font}" stroke-width="${unit*2.5}" class="${territorySelection.all.has(c.id)?'selected-label':''}">${esc(c.name)}</text>`).join('');
}
function focusTerritories(ids=territorySelection.all){
 const countries=[...ids].map(id=>countryLookup.get(id)).filter(Boolean);
 if(!countries.length){mapBox=[0,0,1080,540];applyMapBox();return;}
 const x=Math.min(...countries.map(c=>c.bounds[0])),y=Math.min(...countries.map(c=>c.bounds[1])),right=Math.max(...countries.map(c=>c.bounds[2])),bottom=Math.max(...countries.map(c=>c.bounds[3]));
 const width=Math.max(6,right-x),height=Math.max(6,bottom-y);
 mapBox=[(x+right)/2-width*.8,(y+bottom)/2-height*.8,width*1.6,height*1.6];applyMapBox();
}
function mapZoom(factor,anchor){
 const [x,y,w,h]=mapBox,newW=Math.min(1400,Math.max(2,w/factor)),ratio=newW/w;
 const ax=anchor?.[0]??x+w/2,ay=anchor?.[1]??y+h/2;
 mapBox=[ax-(ax-x)*ratio,ay-(ay-y)*ratio,newW,h*ratio];applyMapBox();
}
function mapPoint(e){const r=$('mapViewport').getBoundingClientRect(),u=Math.max(mapBox[2]/r.width,mapBox[3]/r.height);return [mapBox[0]+(e.clientX-r.left-(r.width-mapBox[2]/u)/2)*u,mapBox[1]+(e.clientY-r.top-(r.height-mapBox[3]/u)/2)*u];}
function initTerritories(){
 $('countrySearch').oninput=renderCountryOptions;
 $('countryOptions').onchange=e=>{if(!e.target.matches('input[type=checkbox]'))return;e.target.checked?countryChoice.add(e.target.value):countryChoice.delete(e.target.value);$('countrySelection').textContent=`${countryChoice.size} assigned directly`;};
 $('mapFocus').onclick=()=>focusTerritories();
 $('mapWorld').onclick=()=>{mapBox=[0,0,1080,540];applyMapBox();};
 $('mapPlus').onclick=()=>mapZoom(1.5);$('mapMinus').onclick=()=>mapZoom(1/1.5);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-focus-country]');if(b)focusTerritories([b.dataset.focusCountry]);});
 const vp=$('mapViewport');
 vp.addEventListener('wheel',e=>{e.preventDefault();mapZoom(Math.exp(-e.deltaY*.0015),mapPoint(e));},{passive:false});
 vp.onpointerdown=e=>{const r=vp.getBoundingClientRect();mapDragging={x:e.clientX,y:e.clientY,box:[...mapBox],unit:Math.max(mapBox[2]/r.width,mapBox[3]/r.height)};vp.setPointerCapture(e.pointerId);};
 vp.onpointermove=e=>{if(!mapDragging)return;const d=mapDragging;mapBox=[d.box[0]-(e.clientX-d.x)*d.unit,d.box[1]-(e.clientY-d.y)*d.unit,d.box[2],d.box[3]];applyMapBox();};
 vp.onpointerup=vp.onpointercancel=()=>{mapDragging=null;};
 vp.onkeydown=e=>{const shifts={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(shifts[e.key]){e.preventDefault();mapBox[0]+=shifts[e.key][0]*mapBox[2]*.08;mapBox[1]+=shifts[e.key][1]*mapBox[3]*.08;applyMapBox();}else if(e.key==='+'||e.key==='='){e.preventDefault();mapZoom(1.5);}else if(e.key==='-'){e.preventDefault();mapZoom(1/1.5);}};
 $('mapExample').onclick=()=>{
  const root=crypto.randomUUID(),jordan=crypto.randomUUID(),syria=crypto.randomUUID();
  const next=[...data,{id:root,name:'Mashriqi',parents:[],countries:[],flag:'',notes:'User-requested map example: select this parent to highlight Jordan and Syria.'},{id:jordan,name:'Jordanian',parents:[root],countries:['400'],flag:'',notes:''},{id:syria,name:'Syrian',parents:[root],countries:['760'],flag:'',notes:''}];
  try{validate(next);data=next;selected=root;save();render();fit();focusTerritories();notify('Mashriqi example added');}catch(e){notify(e.message);}
 };
 new ResizeObserver(()=>drawMapLabels()).observe(vp);
 focusTerritories();
}
