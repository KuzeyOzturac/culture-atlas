// Human-readable atlas scripts. IDs are included in exports so edits preserve identity.
(function(root){
 const quoted='"(?:\\\\.|[^"\\\\])*"';
 const ref=`(?:@${quoted}|${quoted})`;
 const q=s=>JSON.stringify(s);
 function parseAtlas(source,{countries,provinces,makeId}){
  const countryById=new Map(countries.map(c=>[c.id,c]));
  const provinceById=new Map(provinces.map(p=>[p.id,p]));
  const definitions=[],lines=source.replace(/\r\n?/g,'\n').split('\n');
  let current=null;
  const fail=(line,message)=>{throw Error(`Line ${line}: ${message}`);};
  const read=(raw,line)=>{try{return JSON.parse(raw);}catch{fail(line,'Expected a quoted string.');}};
  const unique=(items,name,line,kind)=>{
   const matches=items.filter(item=>item.name.toLocaleLowerCase()===name.toLocaleLowerCase());
   if(matches.length!==1)fail(line,matches.length?`Ambiguous ${kind} ${q(name)}. Use its @ID.`:`Unknown ${kind} ${q(name)}.`);
   return matches[0].id;
  };
  function resolveCountry(raw,line){return raw.startsWith('@')?(countryById.has(read(raw.slice(1),line))?read(raw.slice(1),line):fail(line,'Unknown country ID.')):unique(countries,read(raw,line),line,'country');}
  function resolveProvince(raw,countryRaw,line){
   if(raw.startsWith('@')){const id=read(raw.slice(1),line),province=provinceById.get(id);if(!province)fail(line,'Unknown province ID.');if(countryRaw&&province.country!==resolveCountry(countryRaw,line))fail(line,'Province does not belong to that country.');return id;}
   const country=resolveCountry(countryRaw,line);
   return unique(provinces.filter(p=>p.country===country),read(raw,line),line,'province');
  }
  const header=new RegExp(`^(culture|diverge|hybridize)\\s+(.+)$`);
  const culture=new RegExp(`^(${quoted})(?:\\s+as\\s+@(${quoted}))?$`);
  const divergence=new RegExp(`^(${ref})\\s*->\\s*(${quoted})(?:\\s+as\\s+@(${quoted}))?$`);
  const hybrid=new RegExp(`^(${ref})\\s*\\+\\s*(${ref})\\s*->\\s*(${quoted})(?:\\s+as\\s+@(${quoted}))?$`);
  const territoryCountry=new RegExp(`^territory:\\s*country\\s+(${ref})$`);
  const territoryProvince=new RegExp(`^territory:\\s*province\\s+(${ref})(?:\\s+in\\s+(${ref}))?$`);
  const field=new RegExp(`^(flag|note):\\s*(${quoted})$`);
  for(let i=0;i<lines.length;i++){
   const raw=lines[i],line=i+1,trimmed=raw.trim();
   if(!trimmed||trimmed.startsWith('#'))continue;
   if(!/^\s/.test(raw)){
    const h=header.exec(trimmed);if(!h)fail(line,'Expected culture, diverge, or hybridize.');
    const match=(h[1]==='culture'?culture:h[1]==='diverge'?divergence:hybrid).exec(h[2]);
    if(!match)fail(line,'Invalid culture declaration. Quote names and use as @"id" for stable IDs.');
    const name=read(h[1]==='culture'?match[1]:h[1]==='diverge'?match[2]:match[3],line);
    const idRaw=h[1]==='culture'?match[2]:h[1]==='diverge'?match[3]:match[4];
    current={id:idRaw?read(idRaw,line):makeId(),name,parents:[],countries:[],provinces:[],flag:'',notes:'',_refs:h[1]==='culture'?[]:h[1]==='diverge'?[match[1]]:[match[1],match[2]],_line:line};
    definitions.push(current);continue;
   }
   if(!current)fail(line,'Put properties below a culture declaration.');
   let match=field.exec(trimmed);
   if(match){const key=match[1]==='note'?'notes':'flag';if(current[`_${key}Seen`])fail(line,`Duplicate ${match[1]} property.`);current[key]=read(match[2],line);current[`_${key}Seen`]=true;continue;}
   match=territoryCountry.exec(trimmed);
   if(match){current.countries.push(resolveCountry(match[1],line));continue;}
   match=territoryProvince.exec(trimmed);
   if(match){if(!match[1].startsWith('@')&&!match[2])fail(line,'Named provinces need an in country clause.');current.provinces.push(resolveProvince(match[1],match[2],line));continue;}
   fail(line,'Unknown property. Use flag, note, or territory.');
  }
  const byId=new Map(),byName=new Map();
  for(const n of definitions){
   if(byId.has(n.id))fail(n._line,`Duplicate culture ID ${q(n.id)}.`);
   byId.set(n.id,n);
   const key=n.name.toLocaleLowerCase();byName.set(key,[...(byName.get(key)||[]),n]);
  }
  for(const n of definitions){
   n.parents=n._refs.map(raw=>{
    if(raw.startsWith('@')){const id=read(raw.slice(1),n._line);if(!byId.has(id))fail(n._line,`Unknown parent ID ${q(id)}.`);return id;}
    const name=read(raw,n._line),matches=byName.get(name.toLocaleLowerCase())||[];
    if(matches.length!==1)fail(n._line,matches.length?`Ambiguous parent ${q(name)}. Use its @ID.`:`Unknown parent ${q(name)}.`);
    return matches[0].id;
   });
   delete n._refs;delete n._line;delete n._flagSeen;delete n._notesSeen;
  }
  return definitions;
 }
 function formatAtlas(cultures,{countries,provinces}){
  const countryById=new Map(countries.map(c=>[c.id,c]));
  const provinceById=new Map(provinces.map(p=>[p.id,p]));
  const byId=new Map(cultures.map(c=>[c.id,c]));
  const counts=new Map();for(const c of cultures){const key=c.name.toLocaleLowerCase();counts.set(key,(counts.get(key)||0)+1);}
  const reference=id=>{const c=byId.get(id);return c&&counts.get(c.name.toLocaleLowerCase())===1?q(c.name):`@${q(id)}`;};
  const uniqueName=(items,name)=>items.filter(item=>item.name.toLocaleLowerCase()===name.toLocaleLowerCase()).length===1;
  const countryRef=id=>{const c=countryById.get(id);return c&&uniqueName(countries,c.name)?q(c.name):`@${q(id)}`;};
  const provinceRef=id=>{
   const p=provinceById.get(id),c=countryById.get(p?.country);
   if(!p||!c)return `territory: province @${q(id)}`;
   const peers=provinces.filter(item=>item.country===p.country);
   return uniqueName(peers,p.name)?`territory: province ${q(p.name)} in ${countryRef(c.id)}`:`territory: province @${q(id)}`;
  };
  return cultures.map(c=>{
   const head=c.parents.length===2?`hybridize ${reference(c.parents[0])} + ${reference(c.parents[1])} -> ${q(c.name)}`:c.parents.length===1?`diverge ${reference(c.parents[0])} -> ${q(c.name)}`:`culture ${q(c.name)}`;
   const lines=[`${head} as @${q(c.id)}`];
   if(c.flag)lines.push(`  flag: ${q(c.flag)}`);
   for(const id of c.countries||[])lines.push(`  territory: country ${countryRef(id)}`);
   for(const id of c.provinces||[])lines.push(`  ${provinceRef(id)}`);
   if(c.notes)lines.push(`  note: ${q(c.notes)}`);
   return lines.join('\n');
  }).join('\n\n');
 }
 root.AtlasLanguage={parseAtlas,formatAtlas};
 if(typeof module!=='undefined')module.exports=root.AtlasLanguage;
})(typeof window!=='undefined'?window:globalThis);
