import {readFileSync,writeFileSync,readdirSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {geoEquirectangular,geoPath,geoArea} from 'd3-geo';

const source=resolve('province-geo'),out=resolve('province-paths');
rmSync(out,{recursive:true,force:true});mkdirSync(out);
const projection=geoEquirectangular().scale(540/Math.PI).translate([540,270]).precision(.15);
const path=geoPath(projection).digits(2);
let count=0;
for(const file of readdirSync(source).filter(f=>f.endsWith('.json'))){
 const collection=JSON.parse(readFileSync(resolve(source,file)));
 const items=[];
 for(const feature of collection.features){
  for(const coordinates of feature.geometry.coordinates){
   if(geoArea({type:'Polygon',coordinates})>2*Math.PI)coordinates.forEach(ring=>ring.reverse());
  }
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
