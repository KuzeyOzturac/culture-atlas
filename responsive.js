const workspaceViews=new Set(window.matchMedia('(max-width: 650px)').matches?['tree']:['tree','map']);
let drawerNode=null,drawerHome=null;
function syncWorkspace(){
 for(const view of ['tree','map','text'])document.body.classList.toggle(`view-${view}`,workspaceViews.has(view));
 document.querySelector('.surfaces').dataset.count=String(workspaceViews.size);
 $('viewEmpty').hidden=workspaceViews.size!==0;
 document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(workspaceViews.has(b.dataset.view))));
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
 if(added&&innerWidth<1400)requestAnimationFrame(()=>document.querySelector({tree:'.workspace',map:'.map-panel',text:'.text-panel'}[view]).scrollIntoView({block:'nearest',behavior:'smooth'}));
});
$('focusNode').onclick=()=>keepSelectedVisible(true);
window.addEventListener('resize',()=>{if(innerWidth>1100&&$('panelDialog').open)$('panelDialog').close();syncWorkspace();});
syncWorkspace();
