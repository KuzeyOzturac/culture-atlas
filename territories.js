// Country and province assignments share the existing descendant map behavior.
const countryLookup=new Map(MAP_COUNTRIES.map(c=>[c.id,c]));
const MAP_PROVINCE_PATHS={};
let countryChoice=new Set(),provinceChoice=new Set(),expandedCountry=null,mapBox=[0,0,1080,540],mapDragging=null,mapRendered=false,territoryRender=0;
let territorySelection=aggregateTerritories([],null);
const pathRequests=new Map();
let showAllProvinces=false,provinceViewRender=0,provinceViewTimer;
function loadProvincePaths(country){
 if(MAP_PROVINCE_PATHS[country])return Promise.resolve(MAP_PROVINCE_PATHS[country]);
 if(pathRequests.has(country))return pathRequests.get(country);
 const request=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=`province-paths/${encodeURIComponent(country)}.js?v=20261025-borders2`;
  script.onload=()=>resolve(MAP_PROVINCE_PATHS[country]||[]);
  script.onerror=()=>reject(Error(`Could not load provinces for ${country}.`));
  document.head.append(script);
 });
 pathRequests.set(country,request);
 request.catch(()=>pathRequests.delete(country));
 return request;
}
function openCountryPicker(countries,provinces){
 countryChoice=new Set(countries);provinceChoice=new Set(provinces);expandedCountry=null;
 $('countrySearch').value='';renderCountryOptions();
}
function readCountryPicker(){return {countries:[...countryChoice],provinces:[...provinceChoice]};}
function countryState(id){
 if(countryChoice.has(id))return 'all';
 const provinces=provincesByCountry.get(id)||[];
 return provinces.some(p=>provinceChoice.has(p.id))?'some':'none';
}
function renderCountryOptions(){
 const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 const q=fold($('countrySearch').value.trim());
 $('countrySelection').textContent=`${countryChoice.size} whole countries · ${provinceChoice.size} individual provinces`;
 const matches=MAP_COUNTRIES.filter(c=>fold(c.name).includes(q)||(provincesByCountry.get(c.id)||[]).some(p=>fold(p.name).includes(q)));
 $('countryOptions').innerHTML=matches.map(c=>{
  const available=provincesByCountry.get(c.id)||[],all=available.length>1?available:[],shown=q&&!fold(c.name).includes(q)?all.filter(p=>fold(p.name).includes(q)):all;
  const expanded=q?true:expandedCountry===c.id,state=countryState(c.id);
  return `<div class="country-group"><div class="country-option"><input type="checkbox" data-country-check="${esc(c.id)}" aria-label="Select all of ${esc(c.name)}" ${state==='all'?'checked':''} ${state==='some'?'data-partial="true"':''}><button type="button" class="country-expand" data-expand-country="${esc(c.id)}" aria-expanded="${expanded}" ${!all.length?'disabled':''}>${expanded?'▾':'▸'} ${esc(c.name)} <small>${all.length?`${all.length} ${all.length===1?'region':'regions'}`:'whole country only'}</small></button></div>${expanded&&all.length?`<div class="province-options">${shown.map(p=>{const same=available.filter(other=>other.name===p.name),typed=p.type&&same.filter(other=>other.type===p.type).length===1;return `<label class="country-option province-option"><input type="checkbox" data-province-check="${esc(p.id)}" ${countryChoice.has(c.id)||provinceChoice.has(p.id)?'checked':''}><span>${esc(p.name)}${same.length>1?` <small>${typed?`· ${esc(p.type)}`:`(${same.indexOf(p)+1} of ${same.length})`}</small>`:''}</span></label>`;}).join('')}</div>`:''}</div>`;
 }).join('')||'<p class="hint">No matching countries or provinces.</p>';
 $('countryOptions').querySelectorAll('[data-partial]').forEach(input=>input.indeterminate=true);
}
async function renderTerritories(){
 if(!mapRendered){$('countryPaths').innerHTML=MAP_COUNTRIES.map(c=>`<path data-country="${esc(c.id)}" d="${c.path}" fill-rule="evenodd" vector-effect="non-scaling-stroke"><title>${esc(c.name)}</title></path>`).join('');mapRendered=true;}
 const token=++territoryRender;
 territorySelection=aggregateTerritories(data,selected);
 const n=get(selected),t=territorySelection;
 $('mapTitle').textContent=n?n.name:'Select a culture';
 const count=t.allCountries.size+t.allProvinces.size;
 $('mapStatus').textContent=!n?'Select a culture to see its territory.':count?`${t.allCountries.size} whole countries · ${t.allProvinces.size} individual provinces highlighted`:'No territory assigned to this culture or its descendants. Use Edit culture to assign it.';
 $('mapFocus').disabled=!count;
 $('countryPaths').querySelectorAll('[data-country]').forEach(path=>{
  const id=path.dataset.country;path.classList.toggle('direct-country',t.directCountries.has(id));path.classList.toggle('inherited-country',t.inheritedCountries.has(id));
  path.querySelector('title').textContent=countryLookup.get(id).name+(t.directCountries.has(id)?' — assigned directly':t.inheritedCountries.has(id)?' — from descendants':'');
 });
 const needed=new Set([...t.allProvinces].map(id=>provinceById.get(id)?.country).filter(Boolean));
 $('provincePaths').innerHTML='';
 try{
  const groups=await Promise.all([...needed].map(loadProvincePaths));
  if(token!==territoryRender)return;
  $('provincePaths').innerHTML=groups.flat().filter(p=>t.allProvinces.has(p.id)).map(p=>{
   const meta=provinceById.get(p.id),direct=t.directProvinces.has(p.id);
   return `<path data-province="${esc(p.id)}" class="${direct?'direct-province':'inherited-province'}" d="${p.path}" fill-rule="evenodd" vector-effect="non-scaling-stroke"><title>${esc(meta.name)} — ${direct?'assigned directly':'from descendants'}</title></path>`;
  }).join('');
 }catch(err){if(token===territoryRender)notify(err.message);}
 if(n){
  const panel=document.createElement('div');panel.className='country-details';
  const countries=[...t.allCountries].sort((a,b)=>countryLookup.get(a).name.localeCompare(countryLookup.get(b).name));
  const provinces=[...t.allProvinces].sort((a,b)=>provinceById.get(a).name.localeCompare(provinceById.get(b).name));
  panel.innerHTML=`<h3>TERRITORY · ${count}</h3>${count?`<div class="country-chips">${countries.map(id=>`<button class="country-chip ${t.directCountries.has(id)?'direct':'inherited'}" data-focus-country="${esc(id)}">${esc(countryLookup.get(id).name)}<small>Whole country · ${t.directCountries.has(id)?'Direct':'Descendant'}</small></button>`).join('')}${provinces.map(id=>{const p=provinceById.get(id);return `<button class="country-chip ${t.directProvinces.has(id)?'direct':'inherited'}" data-focus-province="${esc(id)}">${esc(p.name)}<small>${esc(countryLookup.get(p.country)?.name||'')} · ${t.directProvinces.has(id)?'Direct':'Descendant'}</small></button>`}).join('')}</div>`:'<p class="muted">Assign territory in Edit culture.</p>'}`;
  $('details').querySelector('.detail-actions')?.before(panel);
 }
 drawMapLabels();
}
function scheduleProvinceView(){
 clearTimeout(provinceViewTimer);
 provinceViewTimer=setTimeout(renderProvinceView,120);
}
function hideProvinceHover(){ $('provinceHover').hidden=true; }
async function renderProvinceView(){
 const token=++provinceViewRender,layer=$('allProvincePaths');
 layer.replaceChildren();
 hideProvinceHover();
 $('mapViewport').classList.toggle('province-mode',showAllProvinces&&mapBox[2]<=360);
 $('mapProvinces').textContent='Provinces';
 if(!showAllProvinces)return;
 // Province lines are useful at regional scale; at world scale they obscure countries.
 if(mapBox[2]>360){$('mapProvinces').textContent='Provinces · zoom in';$('mapProvinces').title='Zoom in to see province boundaries';return;}
 $('mapProvinces').title='Hide province boundaries';
 const [x,y,w,h]=mapBox;
 const visible=MAP_COUNTRIES.filter(c=>{
  const b=c.bounds;
  return b[0]<x+w&&b[2]>x&&b[1]<y+h&&b[3]>y&&(provincesByCountry.get(c.id)||[]).length>1;
 });
 try{
  const groups=await Promise.all(visible.map(c=>loadProvincePaths(c.id)));
  if(token!==provinceViewRender)return;
  layer.innerHTML=groups.flat().map(p=>`<path data-province="${esc(p.id)}" d="${p.path}" fill-rule="evenodd" vector-effect="non-scaling-stroke"><title>${esc(provinceById.get(p.id)?.name||p.id)} · ${esc(countryLookup.get(provinceById.get(p.id)?.country)?.name||'')}</title></path>`).join('');
 }catch(err){if(token===provinceViewRender)notify(err.message);}
}
function applyMapBox(){ $('countryMap').setAttribute('viewBox',mapBox.join(' '));drawMapLabels();scheduleProvinceView(); }
function drawMapLabels(){
 const rect=$('mapViewport').getBoundingClientRect();if(rect.width<1||rect.height<1)return;const unit=Math.max(mapBox[2]/Math.max(rect.width,1),mapBox[3]/Math.max(rect.height,1)),font=12*unit;
 const hasSelection=territorySelection.allCountries.size+territorySelection.allProvinces.size>0;
 const visible=MAP_COUNTRIES.filter(c=>{const [x,y]=c.center;return x>mapBox[0]&&x<mapBox[0]+mapBox[2]&&y>mapBox[1]&&y<mapBox[1]+mapBox[3]&&(territorySelection.allCountries.has(c.id)||(!hasSelection&&mapBox[2]<180&&(c.bounds[2]-c.bounds[0])/unit>45&&(c.bounds[3]-c.bounds[1])/unit>30));});
 const countryLabels=visible.slice(0,60).map(c=>`<text x="${c.center[0]}" y="${c.center[1]}" font-size="${font}" stroke-width="${unit*2.5}" class="${territorySelection.allCountries.has(c.id)?'selected-label':''}">${esc(c.name)}</text>`);
 const provinceLabels=[...territorySelection.allProvinces].map(id=>MAP_PROVINCE_PATHS[provinceById.get(id)?.country]?.find(p=>p.id===id)).filter(Boolean).filter(p=>{const x=(p.bounds[0]+p.bounds[2])/2,y=(p.bounds[1]+p.bounds[3])/2;return x>mapBox[0]&&x<mapBox[0]+mapBox[2]&&y>mapBox[1]&&y<mapBox[1]+mapBox[3]&&(p.bounds[2]-p.bounds[0])/unit>35&&(p.bounds[3]-p.bounds[1])/unit>18;}).slice(0,20).map(p=>`<text x="${(p.bounds[0]+p.bounds[2])/2}" y="${(p.bounds[1]+p.bounds[3])/2}" font-size="${font}" stroke-width="${unit*2.5}" class="selected-label">${esc(provinceById.get(p.id).name)}</text>`);
 $('countryLabels').innerHTML=[...countryLabels,...provinceLabels].join('');
}
async function focusTerritories(ids=[...territorySelection.allCountries,...territorySelection.allProvinces]){
 try{await Promise.all([...ids].filter(id=>provinceById.has(id)).map(id=>loadProvincePaths(provinceById.get(id).country)));}catch(err){notify(err.message);return;}
 const countries=[...ids].map(id=>countryLookup.get(id)||MAP_PROVINCE_PATHS[provinceById.get(id)?.country]?.find(p=>p.id===id)).filter(Boolean);
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
 $('mapProvinces').onclick=()=>{
  showAllProvinces=!showAllProvinces;
  $('mapProvinces').setAttribute('aria-pressed',String(showAllProvinces));
  scheduleProvinceView();
 };
 $('countrySearch').oninput=renderCountryOptions;
 $('countryOptions').onchange=e=>{
  const input=e.target;if(!input.matches('input[type=checkbox]'))return;
  const result=input.dataset.countryCheck?changeCountry(countryChoice,provinceChoice,input.dataset.countryCheck,input.checked):changeProvince(countryChoice,provinceChoice,input.dataset.provinceCheck,input.checked);
  countryChoice=result.countries;provinceChoice=result.provinces;renderCountryOptions();
 };
 $('countryOptions').onclick=e=>{const button=e.target.closest('[data-expand-country]');if(button){expandedCountry=expandedCountry===button.dataset.expandCountry?null:button.dataset.expandCountry;renderCountryOptions();}};
 $('mapFocus').onclick=()=>focusTerritories();
 $('mapWorld').onclick=()=>{mapBox=[0,0,1080,540];applyMapBox();};
 $('mapPlus').onclick=()=>mapZoom(1.5);$('mapMinus').onclick=()=>mapZoom(1/1.5);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-focus-country], [data-focus-province]');if(b)focusTerritories([b.dataset.focusCountry||b.dataset.focusProvince]);});
 const vp=$('mapViewport');
 vp.addEventListener('pointermove',e=>{
  const id=!mapDragging&&vp.classList.contains('province-mode')?e.target.closest('[data-province]')?.dataset.province:null;
  const province=provinceById.get(id);
  if(!province){hideProvinceHover();return;}
  const hover=$('provinceHover'),rect=vp.getBoundingClientRect();
  hover.textContent=`${province.name} · ${countryLookup.get(province.country)?.name||''}`;
  hover.hidden=false;
  hover.style.left=`${Math.max(8,Math.min(e.clientX-rect.left+14,rect.width-hover.offsetWidth-8))}px`;
  hover.style.top=`${Math.max(8,e.clientY-rect.top-34)}px`;
 });
 vp.addEventListener('pointerleave',hideProvinceHover);
 vp.addEventListener('wheel',e=>{e.preventDefault();mapZoom(Math.exp(-e.deltaY*.0015),mapPoint(e));},{passive:false});
 vp.onpointerdown=e=>{hideProvinceHover();const r=vp.getBoundingClientRect();mapDragging={x:e.clientX,y:e.clientY,box:[...mapBox],unit:Math.max(mapBox[2]/r.width,mapBox[3]/r.height)};vp.setPointerCapture(e.pointerId);};
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
