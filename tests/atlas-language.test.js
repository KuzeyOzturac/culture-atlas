const test=require('node:test');
const assert=require('node:assert/strict');
const {parseAtlas,formatAtlas}=require('../atlas-language');
const env={countries:[{id:'124',name:'Canada'},{id:'840',name:'United States'}],provinces:[{id:'CAN-1',name:'Ontario',country:'124'},{id:'CAN-2',name:'Victoria',country:'124'},{id:'CAN-3',name:'Victoria',country:'124'},{id:'USA-1',name:'Victoria',country:'840'}]};
let serial=0;
const makeId=()=>`new-${++serial}`;
const normalize=items=>items.map(item=>({id:item.id,name:item.name,parents:item.parents,countries:item.countries,provinces:item.provinces,flag:item.flag,notes:item.notes}));

test('JSON data round trips through readable text while keeping internal IDs',()=>{
 const cultures=[
  {id:'a',name:'Coastfolk',parents:[],countries:['124','840'],provinces:[],flag:'',notes:''},
  {id:'b',name:'Valleyfolk',parents:['a'],countries:[],provinces:['CAN-1','CAN-2'],flag:'https://example.com/flag.png',notes:'Line one\nLine two'},
  {id:'c',name:'Estuary culture',parents:['a','b'],countries:[],provinces:['CAN-3'],flag:'',notes:''}
 ];
 const source=formatAtlas(cultures,env);
 assert.doesNotMatch(source,/@|CAN-3|124|"a"/);
 assert.match(source,/territory: country "Canada", "United States"/);
 assert.match(source,/territory: province "Ontario", "Victoria" \(1\) in "Canada"/);
 assert.doesNotMatch(source,/province "Ontario" in/);
 assert.match(source,/province "Victoria" \(2\) in "Canada"/);
 assert.deepEqual(normalize(parseAtlas(source,{...env,makeId,existingCultures:cultures})),cultures);
});

test('a single culture rename keeps its hidden ID',()=>{
 const cultures=[{id:'a',name:'Old',parents:[],countries:[],provinces:[],flag:'',notes:''}];
 assert.equal(parseAtlas('culture "New"',{...env,makeId,existingCultures:cultures})[0].id,'a');
});

test('renaming one of two same-named cultures keeps the other culture at its position',()=>{
 const existing=[
  {id:'a',name:'Same',parents:[],countries:[],provinces:[],flag:'',notes:''},
  {id:'b',name:'Same',parents:[],countries:[],provinces:[],flag:'',notes:''}
 ];
 const result=parseAtlas('culture "Renamed"\n\nculture "Same"',{...env,makeId,existingCultures:existing});
 assert.deepEqual(result.map(item=>item.id),['a','b']);
});

test('duplicate culture names use occurrence numbers',()=>{
 const cultures=[
  {id:'a',name:'Same',parents:[],countries:[],provinces:[],flag:'',notes:''},
  {id:'b',name:'Same',parents:[],countries:[],provinces:[],flag:'',notes:''},
  {id:'c',name:'Child',parents:['a'],countries:[],provinces:[],flag:'',notes:''}
 ];
 const source=formatAtlas(cultures,env);
 assert.match(source,/culture "Same"/);
 assert.match(source,/diverge "Same" \(1\) -> "Child"/);
 assert.deepEqual(normalize(parseAtlas(source,{...env,makeId,existingCultures:cultures})),cultures);
 assert.throws(()=>parseAtlas('culture "Same"\n\nculture "Same"\n\ndiverge "Same" -> "Child"',{...env,makeId}),/Ambiguous parent culture/);
});

test('handwritten scripts accept forward references and optional properties',()=>{
 const source='diverge "Root" -> "Branch"\n  territory: province "Ontario", "Victoria" (2) in "Canada", country "United States"\n\nculture "Root"\n  flag: "https://example.com/root.png"';
 const result=parseAtlas(source,{...env,makeId});
 assert.equal(result[0].parents[0],result[1].id);
 assert.equal(result[0].provinces[0],'CAN-1');
 assert.deepEqual(result[0].provinces,['CAN-1','CAN-3']);
 assert.deepEqual(result[0].countries,['840']);
 assert.equal(result[1].flag,'https://example.com/root.png');
 assert.equal(result[0].notes,'');
});

test('invalid places and fields report line numbers',()=>{
 assert.throws(()=>parseAtlas('culture "A" as @"internal-id"',{...env,makeId}),/Line 1: Expected culture/);
 assert.throws(()=>parseAtlas('culture "A"\n  territory: province "Ontario" in "Atlantis"',{...env,makeId}),/Line 2: Unknown country/);
 assert.throws(()=>parseAtlas('culture "A"\n  period: "1200"',{...env,makeId}),/Line 2: Unknown property/);
 assert.throws(()=>parseAtlas('culture "A"\n  flag: "https://one.test"\n  flag: "https://two.test"',{...env,makeId}),/Line 3: Duplicate flag/);
 assert.throws(()=>parseAtlas('culture "A"\n  territory: province "Victoria" in "Canada"',{...env,makeId}),/Line 2: Ambiguous province/);
 assert.throws(()=>parseAtlas('culture "A"\n  territory: province "Victoria"',{...env,makeId}),/Line 2: Ambiguous province "Victoria". Add its country/);
 assert.throws(()=>parseAtlas('culture "A"\n  territory: country "Canada",',{...env,makeId}),/Line 2: Invalid territory list/);
});

test('commas inside quoted territory names are not list separators',()=>{
 const places={...env,provinces:[...env.provinces,{id:'CAN-4',name:'North, East',country:'124'}]};
 const result=parseAtlas('culture "A"\n  territory: province "North, East", "Ontario"',{...places,makeId});
 assert.deepEqual(result[0].provinces,['CAN-4','CAN-1']);
});
