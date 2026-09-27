"""Decode and simplify country geometry from world-atlas 2.0.2 (Natural Earth, public domain).
Usage: python3 scripts/build-map.py [downloaded-countries-50m.json]
Shared arcs are simplified once to preserve matching country boundaries.
"""
import json, math, sys, urllib.request
from pathlib import Path
source='https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json'
w=json.loads(Path(sys.argv[1]).read_text() if len(sys.argv)>1 else urllib.request.urlopen(source).read())
sx,sy=w['transform']['scale'];tx,ty=w['transform']['translate']
def simplify(points,tolerance=.06):
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
features=[]
for g in w['objects']['countries']['geometries']:
    coordinates=[[ring(r) for r in poly] for poly in ([g['arcs']] if g['type']=='Polygon' else g['arcs'])]
    features.append(dict(type='Feature',id=g.get('id') or 'name:'+g['properties']['name'],properties=g['properties'],geometry=dict(type='MultiPolygon',coordinates=coordinates)))
print(json.dumps(dict(type='FeatureCollection',features=features),separators=(',',':')))
