const provinceById=new Map(MAP_PROVINCES.map(p=>[p.id,p]));
const provincesByCountry=new Map();
for(const province of MAP_PROVINCES){
 if(!provincesByCountry.has(province.country))provincesByCountry.set(province.country,[]);
 provincesByCountry.get(province.country).push(province);
}
for(const provinces of provincesByCountry.values())provinces.sort((a,b)=>a.name.localeCompare(b.name));
function changeCountry(countries,provinces,id,checked){
 const nextCountries=new Set(countries),nextProvinces=new Set(provinces);
 checked?nextCountries.add(id):nextCountries.delete(id);
 for(const province of provincesByCountry.get(id)||[])nextProvinces.delete(province.id);
 return {countries:nextCountries,provinces:nextProvinces};
}
function changeProvince(countries,provinces,id,checked){
 const country=provinceById.get(id)?.country;
 if(!country)return {countries:new Set(countries),provinces:new Set(provinces)};
 const nextCountries=new Set(countries),nextProvinces=new Set(provinces);
 if(nextCountries.delete(country))for(const province of provincesByCountry.get(country))nextProvinces.add(province.id);
 checked?nextProvinces.add(id):nextProvinces.delete(id);
 if((provincesByCountry.get(country)||[]).every(p=>nextProvinces.has(p.id))){
  nextCountries.add(country);
  for(const province of provincesByCountry.get(country))nextProvinces.delete(province.id);
 }
 return {countries:nextCountries,provinces:nextProvinces};
}
function aggregateTerritories(cultures,selectedId){
 const byId=new Map(cultures.map(c=>[c.id,c])),children=new Map();
 cultures.forEach(c=>c.parents.forEach(p=>{if(!children.has(p))children.set(p,[]);children.get(p).push(c.id);}));
 const selected=byId.get(selectedId),directCountries=new Set(selected?.countries||[]),directProvinces=new Set(selected?.provinces||[]);
 const allCountries=new Set(directCountries),allProvinces=new Set(directProvinces),visited=new Set(),queue=selected?[selectedId]:[];
 for(let i=0;i<queue.length;i++){
  const id=queue[i];if(visited.has(id))continue;visited.add(id);
  const culture=byId.get(id);
  (culture.countries||[]).forEach(c=>allCountries.add(c));
  (culture.provinces||[]).forEach(p=>allProvinces.add(p));
  (children.get(id)||[]).forEach(c=>queue.push(c));
 }
 for(const province of allProvinces)if(allCountries.has(provinceById.get(province)?.country)&&!directProvinces.has(province))allProvinces.delete(province);
 return {directCountries,directProvinces,allCountries,allProvinces,
  inheritedCountries:new Set([...allCountries].filter(c=>!directCountries.has(c))),
  inheritedProvinces:new Set([...allProvinces].filter(p=>!directProvinces.has(p)))};
}
