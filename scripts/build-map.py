"""Build local SVG country paths from world-atlas 2.0.2 (Natural Earth, public domain).
Usage: python3 scripts/build-map.py [downloaded-countries-50m.json]
Shared arcs are simplified once to preserve matching country boundaries.
"""
import json, math, sys, urllib.request
from pathlib import Path
source='https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json'
w=json.loads(Path(sys.argv[1]).read_text() if len(sys.argv)>1 else urllib.request.urlopen(source).read())
sx,sy=w['transform']['scale'];tx,ty=w['transform']['translate']
def simplify(points,tolerance=.12):
    if len(points)<3:return points
    x,y=points[0];ex,ey=points[-1];dx,dy=ex-x,ey-y;den=dx*dx+dy*dy
    best=-1;index=0
    for i,(px,py) in enumerate(points[1:-1],1):
        t=max(0,min(1,((px-x)*dx+(py-y)*dy)/den)) if den else 0
        d=(px-x-t*dx)**2+(py-y-t*dy)**2
        if d>best:best=d;index=i
    if best>tolerance*tolerance:return simplify(points[:index+1],tolerance)[:-1]+simplify(points[index:],tolerance)
    return [points[0],points[-1]]
arcs=[]
for a in w['arcs']:
    x=y=0;p=[]
    for dx,dy in a:x+=dx;y+=dy;p.append((x*sx+tx,y*sy+ty))
    q=simplify(p)
    # Preserve tiny closed islands that would otherwise collapse to a line.
    if len(q)<4 and p[0]==p[-1]:q=p
    arcs.append(q)
def ring(indices):
    p=[]
    for i in indices:
        a=arcs[i] if i>=0 else arcs[~i][::-1]
        p.extend(a if not p else a[1:])
    return p
def xy(p):return [round((p[0]+180)*3,2),round((90-p[1])*3,2)]
result=[]
for g in w['objects']['countries']['geometries']:
    polys=[g['arcs']] if g['type']=='Polygon' else g['arcs']
    rings=[ring(r) for poly in polys for r in poly]
    points=[xy(p) for r in rings for p in r]
    if not points:continue
    path=''.join('M'+'L'.join(f'{x:g},{y:g}' for x,y in map(xy,r))+'Z' for r in rings)
    bounds=[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)]
    largest=max(rings,key=lambda r:abs(sum(r[i-1][0]*r[i][1]-r[i][0]*r[i-1][1] for i in range(len(r)))))
    lp=[xy(p) for p in largest];center=[round((min(p[i] for p in lp)+max(p[i] for p in lp))/2,2) for i in [0,1]]
    result.append(dict(id=g.get('id') or 'name:'+g['properties']['name'],name=g['properties']['name'],path=path,bounds=bounds,center=center))
# Some source features share an ISO code (Australia and Ashmore/Cartier).
# Combine them into one selectable country without dropping island geometry.
merged={}
for c in result:
    if c['id'] not in merged:
        merged[c['id']]=c
        continue
    old=merged[c['id']]
    area=lambda b:(b[2]-b[0])*(b[3]-b[1])
    if area(c['bounds'])>area(old['bounds']):old['name']=c['name'];old['center']=c['center']
    old['path']+=c['path']
    old['bounds']=[min(old['bounds'][0],c['bounds'][0]),min(old['bounds'][1],c['bounds'][1]),max(old['bounds'][2],c['bounds'][2]),max(old['bounds'][3],c['bounds'][3])]
result=list(merged.values())
result.sort(key=lambda c:c['name'])
Path('country-data.js').write_text('// Derived from world-atlas 2.0.2 / Natural Earth. See MAP-SOURCES.md.\nconst MAP_COUNTRIES='+json.dumps(result,separators=(',',':'))+';\n')
print(len(result),'country features;',Path('country-data.js').stat().st_size,'bytes')
