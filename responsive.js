const workspaceViews=new Set(window.matchMedia('(max-width: 650px)').matches?['tree']:['tree','map']);
let drawerNode=null,drawerHome=null;
const viewPanels={tree:document.querySelector('.workspace'),map:document.querySelector('.map-panel'),text:document.querySelector('.text-panel')};
const viewWidths=new Map();
function layoutViews(){
 const surface=document.querySelector('.surfaces'),views=['tree','map','text'].filter(view=>workspaceViews.has(view));
 surface.querySelectorAll('.view-splitter').forEach(splitter=>splitter.remove());
 const horizontal=(views.length===2&&innerWidth>=1400)||(views.length===3&&innerWidth>=1600);
 surface.dataset.layout=horizontal?'horizontal':'stacked';
 surface.style.gridTemplateColumns='';
 if(!horizontal)return;
 const key=views.join(','),weights=viewWidths.get(key)||views.map(()=>1);
 viewWidths.set(key,weights);
 const draw=()=>{surface.style.gridTemplateColumns=weights.flatMap((weight,index)=>index===views.length-1?[`minmax(240px,${weight}fr)`]:[`minmax(240px,${weight}fr)`,'10px']).join(' ');};
 draw();
 views.slice(0,-1).forEach((view,index)=>{
  const splitter=document.createElement('div');
  splitter.className='view-splitter';splitter.tabIndex=0;splitter.setAttribute('role','separator');splitter.setAttribute('aria-orientation','vertical');
  splitter.setAttribute('aria-label',`Resize ${view} and ${views[index+1]} views`);
  splitter.setAttribute('aria-valuemin','0');splitter.setAttribute('aria-valuemax','100');
  splitter.setAttribute('aria-valuenow',String(Math.round(weights[index]/(weights[index]+weights[index+1])*100)));
  const left=viewPanels[view],right=viewPanels[views[index+1]];
  const resize=(leftWidth,rightWidth,delta)=>{
   const total=leftWidth+rightWidth,next=Math.max(240,Math.min(total-240,leftWidth+delta)),sum=weights[index]+weights[index+1];
   weights[index]=sum*next/total;weights[index+1]=sum-weights[index];
   splitter.setAttribute('aria-valuenow',String(Math.round(next/total*100)));draw();
  };
  splitter.onpointerdown=event=>{
   event.preventDefault();splitter.setPointerCapture(event.pointerId);
   const start=event.clientX,leftWidth=left.getBoundingClientRect().width,rightWidth=right.getBoundingClientRect().width;
   splitter.onpointermove=move=>resize(leftWidth,rightWidth,move.clientX-start);
   splitter.onpointerup=splitter.onpointercancel=()=>{splitter.onpointermove=null;};
  };
  splitter.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();resize(left.getBoundingClientRect().width,right.getBoundingClientRect().width,event.key==='ArrowLeft'?-30:30);}};
  left.after(splitter);
 });
}
function syncWorkspace(){
 for(const view of ['tree','map','text'])document.body.classList.toggle(`view-${view}`,workspaceViews.has(view));
 document.querySelector('.surfaces').dataset.count=String(workspaceViews.size);
 $('viewEmpty').hidden=workspaceViews.size!==0;
 document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(workspaceViews.has(b.dataset.view))));
 layoutViews();
 $('toggleCultures').setAttribute('aria-expanded',String(drawerNode===$('culturesPanel')||(innerWidth>1100&&!document.body.classList.contains('hide-cultures'))));
 $('toggleDetails').setAttribute('aria-expanded',String(drawerNode===$('details')||(innerWidth>1100&&!document.body.classList.contains('hide-details'))));
 requestAnimationFrame(()=>{if(workspaceViews.has('tree'))fit();if(workspaceViews.has('map'))drawMapLabels();});
}
function restorePanel(){if(drawerNode){drawerHome.append(drawerNode);drawerNode=null;drawerHome=null;}syncWorkspace();}
function panelToggle(id){
 if(innerWidth<=1100){
  drawerNode=$(id);drawerHome=drawerNode.parentElement;
  $('panelTitle').textContent=id==='culturesPanel'?'Cultures':'Culture details';$('panelContent').append(drawerNode);$('panelDialog').showModal();syncWorkspace();
  if(id==='culturesPanel')$('search').focus();
 }else{document.body.classList.toggle(id==='culturesPanel'?'hide-cultures':'hide-details');syncWorkspace();}
}
$('toggleCultures').onclick=()=>panelToggle('culturesPanel');$('toggleDetails').onclick=()=>panelToggle('details');
$('closePanel').onclick=()=>$('panelDialog').close();$('panelDialog').addEventListener('close',restorePanel);
window.closeCultureDrawer=()=>{if(drawerNode===$('culturesPanel'))$('panelDialog').close();};
$('panelDialog').addEventListener('click',e=>{if(e.target===$('panelDialog')){const r=$('panelDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('panelDialog').close();}});
$('atlasMenu').addEventListener('click',e=>{if(e.target.closest('button'))$('atlasMenu').open=false;});
document.addEventListener('click',e=>{if(!$('atlasMenu').contains(e.target))$('atlasMenu').open=false;});
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{
 const view=b.dataset.view,added=!workspaceViews.has(view);
 added?workspaceViews.add(view):workspaceViews.delete(view);
 syncWorkspace();
 if(added&&view==='text')$('atlasSource').focus();
 if(added&&innerWidth<1400)requestAnimationFrame(()=>document.querySelector({tree:'.workspace',map:'.map-panel',text:'.text-panel'}[view]).scrollIntoView({block:'nearest',behavior:'smooth'}));
});
$('focusNode').onclick=()=>keepSelectedVisible(true);
window.addEventListener('resize',()=>{if(innerWidth>1100&&$('panelDialog').open)$('panelDialog').close();syncWorkspace();});
syncWorkspace();
