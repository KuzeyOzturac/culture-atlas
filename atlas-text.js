// The script is a draft until Apply; ordinary visual edits refresh it only when clean.
let atlasTextDirty=false;
let atlasTextBase='';
let atlasTextCultures=[];
const atlasTextEnvironment=()=>({countries:MAP_COUNTRIES,provinces:MAP_PROVINCES,makeId:()=>crypto.randomUUID()});
function updateDraftStatus(){
 $('textStatus').textContent=atlasTextBase!==JSON.stringify(data)?'The atlas changed while this draft was open. Applying it will replace those changes.':'Draft has unapplied changes.';
 $('textStatus').classList.remove('text-error');
}
window.syncAtlasText=()=>{
 if(atlasTextDirty){updateDraftStatus();return;}
 atlasTextBase=JSON.stringify(data);
 atlasTextCultures=structuredClone(data);
 $('atlasSource').value=AtlasLanguage.formatAtlas(data,atlasTextEnvironment());
 $('textStatus').textContent='In sync with your atlas.';
 $('textStatus').classList.remove('text-error');
};
$('atlasSource').addEventListener('input',()=>{
 atlasTextDirty=true;
 updateDraftStatus();
});
$('atlasSource').addEventListener('keydown',event=>{
 if(event.key!=='Tab')return;
 event.preventDefault();
 const editor=event.currentTarget,start=editor.selectionStart,end=editor.selectionEnd;
 if(start===end&&!event.shiftKey){editor.setRangeText('  ',start,end,'end');editor.dispatchEvent(new Event('input',{bubbles:true}));return;}
 const lineStart=editor.value.lastIndexOf('\n',start-1)+1;
 const last=end>start&&editor.value[end-1]==='\n'?end-1:end;
 const lineEnd=editor.value.indexOf('\n',last);
 const blockEnd=lineEnd<0?editor.value.length:lineEnd;
 const block=editor.value.slice(lineStart,blockEnd);
 const changed=block.split('\n').map(line=>event.shiftKey?line.replace(/^ {1,2}/,''):'  '+line).join('\n');
 editor.setRangeText(changed,lineStart,blockEnd,start===end?'end':'select');
 if(start===end){const cursor=Math.max(lineStart,start+changed.length-block.length);editor.setSelectionRange(cursor,cursor);}
 if(changed!==block)editor.dispatchEvent(new Event('input',{bubbles:true}));
});
$('textRestore').onclick=()=>{
 if(atlasTextDirty&&!confirm('Discard your text draft and restore the current atlas?'))return;
 atlasTextDirty=false;syncAtlasText();
};
$('textApply').onclick=()=>{
 try{
  const next=validate(AtlasLanguage.parseAtlas($('atlasSource').value,{...atlasTextEnvironment(),existingCultures:atlasTextCultures}));
  const nextIds=new Set(next.map(n=>n.id));
  const removed=data.filter(n=>!nextIds.has(n.id)).length;
  const changed=atlasTextBase!==JSON.stringify(data);
  if((removed||changed)&&!confirm(`Apply this script?${removed?` It removes ${removed} existing culture${removed===1?'':'s'}.`:''}${changed?' The atlas also changed after you started this draft.':''}`))return;
  data=next;
  if(!nextIds.has(selected))selected=undefined;
  atlasTextDirty=false;
  save();render();fit();if(selected)focusTerritories();
  $('textStatus').textContent=`Applied ${next.length} culture${next.length===1?'':'s'} to your atlas.`;
  $('textStatus').classList.remove('text-error');
 }catch(error){
  $('textStatus').textContent=error.message;
  $('textStatus').classList.add('text-error');
 }
};
window.addEventListener('beforeunload',event=>{if(atlasTextDirty){event.preventDefault();event.returnValue='';}});
syncAtlasText();
