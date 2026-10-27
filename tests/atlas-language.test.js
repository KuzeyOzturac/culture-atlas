const test=require('node:test');
const assert=require('node:assert/strict');
const {parseAtlas,formatAtlas}=require('../atlas-language');
const env={countries:[{id:'124',name:'Canada'},{id:'840',name:'United States'}],provinces:[{id:'CAN-1',name:'Ontario',country:'124'},{id:'CAN-2',name:'Victoria',country:'124'},{id:'USA-1',name:'Victoria',country:'840'}],makeId:()=> 'new-id'};

test('a formatted atlas round trips IDs, relationships, flags, notes, and territories',()=>{
 const cultures=[
  {id:'a',name:'Coastfolk',parents:[],countries:['124'],provinces:[],flag:'',notes:''},
  {id:'b',name:'Valleyfolk',parents:['a'],countries:[],provinces:['CAN-1'],flag:'https://example.com/flag.png',notes:'Line one\nLine two'},
  {id:'c',name:'Estuary culture',parents:['a','b'],countries:[],provinces:['CAN-2'],flag:'',notes:''}
 ];
 assert.deepEqual(parseAtlas(formatAtlas(cultures,env),env),cultures);
});

test('handwritten scripts allow forward references and optional fields',()=>{
 const source='diverge "Root" -> "Branch"\n  territory: province "Ontario" in "Canada"\n\nculture "Root"\n  flag: "https://example.com/root.png"';
 let next=0;
 assert.deepEqual(parseAtlas(source,{...env,makeId:()=>`new-${++next}`}),[
  {id:'new-1',name:'Branch',parents:['new-2'],countries:[],provinces:['CAN-1'],flag:'',notes:''},
  {id:'new-2',name:'Root',parents:[],countries:[],provinces:[],flag:'https://example.com/root.png',notes:''}
 ]);
});

test('ambiguous names require stable ID references',()=>{
 const source='culture "Same" as @"a"\n\nculture "Same" as @"b"\n\ndiverge "Same" -> "Child" as @"c"';
 assert.throws(()=>parseAtlas(source,env),/Line 5: Ambiguous parent/);
 assert.equal(parseAtlas(source.replace('diverge "Same"','diverge @"a"'),env)[2].parents[0],'a');
});

test('invalid map names and unknown fields fail with line numbers',()=>{
 assert.throws(()=>parseAtlas('culture "A"\n  territory: province "Ontario" in "Atlantis"',env),/Line 2: Unknown country/);
 assert.throws(()=>parseAtlas('culture "A"\n  period: "1200"',env),/Line 2: Unknown property/);
 assert.throws(()=>parseAtlas('culture "A"\n  flag: "https://one.test"\n  flag: "https://two.test"',env),/Line 3: Duplicate flag/);
 assert.throws(()=>parseAtlas('culture "A"\n  territory: province @"CAN-1" in "United States"',env),/Line 2: Province does not belong/);
});
