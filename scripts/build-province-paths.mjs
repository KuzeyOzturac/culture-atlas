import {readFileSync,writeFileSync,readdirSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {geoEquirectangular,geoPath,geoArea} from 'd3-geo';

const source=resolve('province-geo'),out=resolve('province-paths');
rmSync(out,{recursive:true,force:true});mkdirSync(out);
const projection=geoEquirectangular().scale(540/Math.PI).translate([540,270]).precision(.15);
const path=geoPath(projection).digits(2);
const countries=JSON.parse(readFileSync('country-data.js','utf8').match(/const MAP_COUNTRIES=(.*);/)[1]);
const countryGeo=JSON.parse(readFileSync('country-geo.json','utf8'));
function orient(feature){
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 for(const coordinates of polygons)if(geoArea({type:'Polygon',coordinates})>2*Math.PI)coordinates.forEach(ring=>ring.reverse());
 return polygons;
}
for(const country of countries){
 const geometry=countryGeo[country.id];if(!geometry)throw Error(`Missing geometry for ${country.id}`);
 const feature={type:'Feature',geometry};
 const polygons=orient(feature);
 const [[x,y],[r,b]]=path.bounds(feature);
 const largest=polygons.map(coordinates=>({type:'Polygon',coordinates})).reduce((a,b)=>path.area(a)>path.area(b)?a:b);
 Object.assign(country,{path:path(feature),bounds:[x,y,r,b].map(n=>+n.toFixed(2)),center:path.centroid(largest).map(n=>+n.toFixed(2))});
}
writeFileSync('country-data.js','// Natural Earth 10m ADM1 unions; see MAP-SOURCES.md.\nconst MAP_COUNTRIES='+JSON.stringify(countries)+';\n');
let count=0;
for(const file of readdirSync(source).filter(f=>f.endsWith('.json'))){
 const collection=JSON.parse(readFileSync(resolve(source,file)));
 const items=[];
 for(const feature of collection.features){
  orient(feature);
  const d=path(feature);if(!d)continue;
  const [[x,y],[r,b]]=path.bounds(feature);
  const polygons=feature.geometry.coordinates.map(coordinates=>({type:'Polygon',coordinates}));
  const largest=polygons.reduce((a,b)=>path.area(a)>path.area(b)?a:b);
  items.push({id:feature.id,path:d,bounds:[x,y,r,b].map(n=>+n.toFixed(2)),center:path.centroid(largest).map(n=>+n.toFixed(2))});
 }
 writeFileSync(resolve(out,file.replace('.json','.js')),'MAP_PROVINCE_PATHS['+JSON.stringify(file.replace('.json',''))+']='+JSON.stringify(items)+';\n');
 count+=items.length;
}
console.log(`${count} rendered province paths`);
