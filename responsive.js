let workspaceMode=window.matchMedia('(max-width: 650px)').matches?'tree':'split';
let drawerNode=null,drawerHome=null;
function syncWorkspace(){
 document.body.dataset.view=workspaceMode;
 document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===workspaceMode)));
 $('toggleCultures').setAttribute('aria-expanded',String(drawerNode===$('culturesPanel')||(innerWidth>1100&&!document.body.classList.contains('hide-cultures'))));
 $('toggleDetails').setAttribute('aria-expanded',String(drawerNode===$('details')||(innerWidth>1100&&!document.body.classList.contains('hide-details'))));
 requestAnimationFrame(()=>{fit();drawMapLabels();});
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
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>{workspaceMode=b.dataset.view;syncWorkspace();});
$('focusNode').onclick=()=>keepSelectedVisible(true);
window.addEventListener('resize',()=>{if(innerWidth>1100&&$('panelDialog').open)$('panelDialog').close();syncWorkspace();});
syncWorkspace();
