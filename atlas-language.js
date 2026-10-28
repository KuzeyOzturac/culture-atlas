// The script names cultures and places; internal IDs stay in the atlas data.
(function(root){
 const quoted='"(?:\\\\.|[^"\\\\])*"';
 const reference=`${quoted}(?:\\s+\\([1-9][0-9]*\\))?`;
 const q=value=>JSON.stringify(value);
 const key=value=>value.toLocaleLowerCase();
 const read=(raw,line)=>{try{return JSON.parse(raw);}catch{throw Error(`Line ${line}: Expected a quoted string.`);}};
 const fail=(line,message)=>{throw Error(`Line ${line}: ${message}`);};
 function selectPlace(items,name,number,line,kind){
  const matches=items.filter(item=>key(item.name)===key(name));
  if(!matches.length)fail(line,`Unknown ${kind} ${q(name)}.`);
  if(!number&&matches.length>1)fail(line,`Ambiguous ${kind} ${q(name)}. Add its occurrence number.`);
  const result=matches[(number?Number(number):1)-1];
  if(!result)fail(line,`No occurrence ${number} of ${kind} ${q(name)}.`);
  return result;
 }
 function parseAtlas(source,{countries,provinces,makeId,existingCultures=[]}){
  const definitions=[],lines=source.replace(/\r\n?/g,'\n').split('\n');
  const countryPattern=new RegExp(`^(${quoted})(?:\\s+\\(([1-9][0-9]*)\\))?$`);
  const provincePattern=new RegExp(`^(${quoted})(?:\\s+\\(([1-9][0-9]*)\\))?(?:\\s+in\\s+(${quoted})(?:\\s+\\(([1-9][0-9]*)\\))?)?$`);
  const rootPattern=new RegExp(`^culture\\s+(${quoted})$`);
  const divergePattern=new RegExp(`^diverge\\s+(${reference})\\s*->\\s*(${quoted})$`);
  const hybridPattern=new RegExp(`^hybridize\\s+(${reference})\\s*\\+\\s*(${reference})\\s*->\\s*(${quoted})$`);
  const referencePattern=new RegExp(`^(${quoted})(?:\\s+\\(([1-9][0-9]*)\\))?$`);
  const fieldPattern=new RegExp(`^(flag|note):\\s*(${quoted})$`);
  let current=null;
  for(let i=0;i<lines.length;i++){
   const raw=lines[i],line=i+1,value=raw.trim();
   if(!value||value.startsWith('#'))continue;
   if(!/^\s/.test(raw)){
    const rootMatch=rootPattern.exec(value),divergeMatch=divergePattern.exec(value),hybridMatch=hybridPattern.exec(value);
    const match=rootMatch||divergeMatch||hybridMatch;
    if(!match)fail(line,'Expected culture, diverge, or hybridize with quoted names.');
    const name=read(rootMatch?match[1]:divergeMatch?match[2]:match[3],line);
    current={name,parents:[],countries:[],provinces:[],flag:'',notes:'',_refs:rootMatch?[]:divergeMatch?[match[1]]:[match[1],match[2]],_line:line};
    definitions.push(current);continue;
   }
   if(!current)fail(line,'Put properties below a culture declaration.');
   let match=fieldPattern.exec(value);
   if(match){
    const property=match[1]==='note'?'notes':'flag';
    if(current[`_${property}Seen`])fail(line,`Duplicate ${match[1]} property.`);
    current[property]=read(match[2],line);current[`_${property}Seen`]=true;continue;
   }
   if(value.startsWith('territory:')){
    let part='',quotedText=false,escaped=false,kind='';
    const items=[];
    for(const char of value.slice('territory:'.length)){
     if(char===','&&!quotedText){items.push(part.trim());part='';continue;}
     part+=char;
     if(escaped)escaped=false;else if(char==='\\'&&quotedText)escaped=true;else if(char==='"')quotedText=!quotedText;
    }
    items.push(part.trim());
    for(const item of items){
     const typed=/^(country|province)\s+/.exec(item);
     if(typed)kind=typed[1];
     const text=typed?item.slice(typed[0].length):item;
     match=(kind==='country'?countryPattern:kind==='province'?provincePattern:null)?.exec(text);
     if(!match)fail(line,'Invalid territory list. Use country or province followed by quoted names, separated by commas.');
     if(kind==='country'){current.countries.push(selectPlace(countries,read(match[1],line),match[2],line,'country').id);continue;}
     const name=read(match[1],line),country=match[3]?selectPlace(countries,read(match[3],line),match[4],line,'country'):null;
     if(!country&&provinces.filter(place=>key(place.name)===key(name)).length>1)fail(line,`Ambiguous province ${q(name)}. Add its country with in ${q('Country')}.`);
     current.provinces.push(selectPlace(country?provinces.filter(place=>place.country===country.id):provinces,name,match[2],line,'province').id);
    }
    continue;
   }
   fail(line,'Unknown property. Use flag, note, or territory.');
  }
  const existingByName=new Map();
  for(const culture of existingCultures){
   const nameKey=key(culture.name);existingByName.set(nameKey,[...(existingByName.get(nameKey)||[]),culture]);
  }
  const usedIds=new Set();
  definitions.forEach((culture,index)=>{
   const prior=existingCultures[index];
   if(prior&&key(prior.name)===key(culture.name)){culture.id=prior.id;usedIds.add(prior.id);}
  });
  for(const culture of definitions)if(!culture.id){
   const matches=(existingByName.get(key(culture.name))||[]).filter(item=>!usedIds.has(item.id));
   if(matches.length){culture.id=matches[0].id;usedIds.add(culture.id);}
  }
  // A single unmatched pair is a likely rename, so keep that culture's identity.
  const unmatched=definitions.filter(item=>!item.id),remaining=existingCultures.filter(item=>!usedIds.has(item.id));
  if(unmatched.length===1&&remaining.length===1){unmatched[0].id=remaining[0].id;usedIds.add(remaining[0].id);}
  for(const culture of definitions)if(!culture.id){culture.id=makeId();while(usedIds.has(culture.id))culture.id=makeId();usedIds.add(culture.id);}
  for(const culture of definitions){
   culture.parents=culture._refs.map(raw=>{
    const match=referencePattern.exec(raw);
    return selectPlace(definitions,read(match[1],culture._line),match[2],culture._line,'parent culture').id;
   });
   delete culture._refs;delete culture._line;delete culture._flagSeen;delete culture._notesSeen;
  }
  return definitions;
 }
 function formatAtlas(cultures,{countries,provinces}){
  const countryById=new Map(countries.map(item=>[item.id,item]));
  const provinceById=new Map(provinces.map(item=>[item.id,item]));
  const cultureById=new Map(cultures.map(item=>[item.id,item]));
  const placeRef=(items,item)=>{const matches=items.filter(other=>key(other.name)===key(item.name));return q(item.name)+(matches.length>1?` (${matches.indexOf(item)+1})`:'');};
  const parentRef=id=>placeRef(cultures,cultureById.get(id));
  return cultures.map(culture=>{
   const head=culture.parents.length===2?`hybridize ${parentRef(culture.parents[0])} + ${parentRef(culture.parents[1])} -> ${q(culture.name)}`:culture.parents.length===1?`diverge ${parentRef(culture.parents[0])} -> ${q(culture.name)}`:`culture ${q(culture.name)}`;
   const result=[head];
   if(culture.flag)result.push(`  flag: ${q(culture.flag)}`);
   const territories=[];
   for(const id of culture.countries||[]){const country=countryById.get(id);if(country)territories.push({kind:'country',text:placeRef(countries,country)});}
   for(const id of culture.provinces||[]){
    const province=provinceById.get(id),country=countryById.get(province?.country);
    if(province&&country){
     const matches=provinces.filter(item=>key(item.name)===key(province.name));
     territories.push({kind:'province',text:matches.length===1?q(province.name):`${placeRef(provinces.filter(item=>item.country===country.id),province)} in ${placeRef(countries,country)}`});
    }
   }
   if(territories.length)result.push(`  territory: ${territories.map((place,index)=>`${index&&territories[index-1].kind===place.kind?'':place.kind+' '}${place.text}`).join(', ')}`);
   if(culture.notes)result.push(`  note: ${q(culture.notes)}`);
   return result.join('\n');
  }).join('\n\n');
 }
 root.AtlasLanguage={parseAtlas,formatAtlas};
 if(typeof module!=='undefined')module.exports=root.AtlasLanguage;
})(typeof window!=='undefined'?window:globalThis);
