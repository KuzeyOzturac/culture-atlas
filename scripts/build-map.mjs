// Antimeridian clipping is handled by d3-geo, before projection to SVG.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=process.env.MAP_BUILD_MODULES||resolve('node_modules');
const {geoEquirectangular,geoPath,geoArea}=await import(pathToFileURL(resolve(modules,'d3-geo/src/index.js')));
const collection=JSON.parse(execFileSync('python3',['scripts/build-map.py',...process.argv.slice(2)],{maxBuffer:20e6,encoding:'utf8'}));
const projection=geoEquirectangular().scale(540/Math.PI).translate([540,270]).precision(.15);
const path=geoPath(projection).digits(2),merged=new Map();
for(const f of collection.features){
 // Simplification can flip a tiny island's winding; prevent complementary globe fills.
 for(const coordinates of f.geometry.coordinates){
  if(geoArea({type:'Polygon',coordinates})>2*Math.PI)coordinates.forEach(ring=>ring.reverse());
 }
 const [[x,y],[r,b]]=path.bounds(f),d=path(f);if(!d)continue;
 const polygons=f.geometry.coordinates.map(coordinates=>({type:'Polygon',coordinates}));
 const largest=polygons.reduce((a,b)=>path.area(a)>path.area(b)?a:b);
 const c={id:f.id,name:f.properties.name,path:d,bounds:[x,y,r,b].map(n=>+n.toFixed(2)),center:path.centroid(largest).map(n=>+n.toFixed(2))};
 const old=merged.get(c.id);
 if(old){const area=b=>(b[2]-b[0])*(b[3]-b[1]);if(area(c.bounds)>area(old.bounds)){old.name=c.name;old.center=c.center;}old.path+=c.path;old.bounds=[Math.min(old.bounds[0],x),Math.min(old.bounds[1],y),Math.max(old.bounds[2],r),Math.max(old.bounds[3],b)];}
 else merged.set(c.id,c);
}
const countries=[...merged.values()].sort((a,b)=>a.name.localeCompare(b.name));
writeFileSync('country-data.js','// Natural Earth via world-atlas; clipped with d3-geo. See MAP-SOURCES.md.\nconst MAP_COUNTRIES='+JSON.stringify(countries)+';\n');
console.log(countries.length+' country features; '+readFileSync('country-data.js').length+' bytes');
