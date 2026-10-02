#!/usr/bin/env python3
"""Installed VJ delivery: all prepared codec metadata, ranges, public isolation and Git exclusions."""
import json, subprocess, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
BASE='https://strudel.xxc.dk'
passed=0

def check(value,label):
 global passed
 assert value,label
 passed+=1
 print('PASS',label)

def request(path,method='GET',headers=None):
 try:
  with urllib.request.urlopen(urllib.request.Request(BASE+path,method=method,headers={'User-Agent':'XXC-Strudel-VJ-Tests/1.0',**(headers or {})}),timeout=20) as r: return r.status,r.headers,r.read()
 except urllib.error.HTTPError as r: return r.code,r.headers,r.read()

status,headers,data=request('/vjloops/catalog.json')
check(status==200,'VJ catalogue served')
catalog=json.loads(data)
check(len(catalog['packs'])==3 and len(catalog['clips'])==146,'three operator packs and all 146 clips installed')
clip=catalog['clips'][0]
status,headers,part=request(clip['url'],headers={'Range':'bytes=0-127'})
check(status==206 and len(part)==128,'MP4 byte-range seeking')
check(headers['Content-Type']=='video/mp4' and b'ftyp' in part,'inspected MP4 container')
check(not headers.get('Set-Cookie'),'video delivery does not create a session')
check('immutable' in headers['Cache-Control'],'immutable video delivery')
check(request(clip['url'],'HEAD')[0]==200,'HEAD video request')
check(request(clip['url'],'POST')[0]==405,'video mutation denied')
check(request(clip['url'],headers={'Range':'bytes=9-1'})[0]==416,'invalid video range rejected')
status,headers,data=request(clip['poster'])
check(status==200 and data[:2]==b'\xff\xd8' and headers['Content-Type']=='image/jpeg','real generated JPEG thumbnail')
for path in ['/vj-media.php?file=../../config/secrets.json','/vj-media.php?file[]=x','/vjloops/video/'+('0'*64)+'.mp4','/storage/vjloops/installed.json','/assets/vjloops/pack1/README.txt']:
 check(request(path)[0] in [403,404],'private or invalid VJ path denied')
installed=json.loads((ROOT/'storage/vjloops/installed.json').read_text())
for c in installed:
 streams=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,pix_fmt,width','-of','json',str(ROOT/'storage/vjloops/video'/c['file'])]))['streams']
 assert not any(s['codec_type']=='audio' for s in streams)
 result=next(s for s in streams if s['codec_type']=='video')
 assert result['codec_type']=='video' and result['codec_name']=='h264' and result['pix_fmt'] in ['yuv420p','yuvj420p'] and result['width']<=1280
check(True,'every installed clip is normalized H.264 / 8-bit 4:2:0, at most 1280 pixels wide, without audio')
check(all(p.stat().st_uid==0 and p.stat().st_gid==33 for p in (ROOT/'storage/vjloops/video').iterdir()),'PHP can read but cannot modify VJ videos')
check(not subprocess.check_output(['git','ls-files','assets/vjloops','storage/vjloops','html/vjloops'],cwd=ROOT),'VJ media excluded from Git')
print(f'PASS {passed} VJ media checks')
