const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');

const context=vm.createContext({MAP_PROVINCES:[
 {id:'CA-ON',name:'Ontario',country:'124'},
 {id:'CA-QC',name:'Quebec',country:'124'},
 {id:'US-NY',name:'New York',country:'840'}
]});
vm.runInContext(readFileSync('territory-model.js','utf8')+'\nthis.model={changeCountry,changeProvince,aggregateTerritories}',context);
const {changeCountry,changeProvince,aggregateTerritories}=context.model;
const values=set=>[...set].sort();

test('unchecking a province turns a full country into its remaining provinces',()=>{
 const changed=changeProvince(new Set(['124']),new Set(),'CA-QC',false);
 assert.deepEqual(values(changed.countries),[]);
 assert.deepEqual(values(changed.provinces),['CA-ON']);
});
test('selecting the last province stores the full country compactly',()=>{
 const changed=changeProvince(new Set(),new Set(['CA-ON']),'CA-QC',true);
 assert.deepEqual(values(changed.countries),['124']);
 assert.deepEqual(values(changed.provinces),[]);
});
test('a parent shows the exact province union and counts hybrid descendants once',()=>{
 const cultures=[
  {id:'a',parents:[],countries:[],provinces:[]},
  {id:'b',parents:['a'],countries:[],provinces:['CA-ON']},
  {id:'c',parents:['a'],countries:[],provinces:['CA-QC']},
  {id:'d',parents:['b','c'],countries:[],provinces:['US-NY']}
 ];
 const result=aggregateTerritories(cultures,'a');
 assert.deepEqual(values(result.allCountries),[]);
 assert.deepEqual(values(result.allProvinces),['CA-ON','CA-QC','US-NY']);
});
test('a whole country covers descendant provinces without expanding stored IDs',()=>{
 const cultures=[{id:'a',parents:[],countries:['124']},{id:'b',parents:['a'],provinces:['CA-ON']}];
 const result=aggregateTerritories(cultures,'a');
 assert.deepEqual(values(result.allCountries),['124']);
 assert.deepEqual(values(result.allProvinces),[]);
});
test('country-only legacy records retain descendant highlights',()=>{
 const cultures=[{id:'a',parents:[]},{id:'b',parents:['a'],countries:['124']}];
 const result=aggregateTerritories(cultures,'a');
 assert.deepEqual(values(result.inheritedCountries),['124']);
 assert.deepEqual(values(result.allProvinces),[]);
});
test('a direct province remains visible over a descendant whole country',()=>{
 const cultures=[{id:'a',parents:[],provinces:['CA-ON']},{id:'b',parents:['a'],countries:['124']}];
 const result=aggregateTerritories(cultures,'a');
 assert.deepEqual(values(result.inheritedCountries),['124']);
 assert.deepEqual(values(result.directProvinces),['CA-ON']);
 assert.deepEqual(values(result.allProvinces),['CA-ON']);
});
test('bundled province index has a path for every selectable province',()=>{
 const atlas=vm.createContext({MAP_PROVINCE_PATHS:{}});
 vm.runInContext(readFileSync('province-index.js','utf8')+'\nthis.provinces=MAP_PROVINCES',atlas);
 const ids=new Set(atlas.provinces.map(p=>p.id));
 const countries=new Set(atlas.provinces.map(p=>p.country));
 for(const country of countries)vm.runInContext(readFileSync(`province-paths/${country}.js`,'utf8'),atlas);
 const pathIds=Object.values(atlas.MAP_PROVINCE_PATHS).flat().map(p=>p.id);
 assert.equal(ids.size,atlas.provinces.length);
 assert.equal(pathIds.length,ids.size);
 assert.ok(pathIds.every(id=>ids.has(id)));
});
