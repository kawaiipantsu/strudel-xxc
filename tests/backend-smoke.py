#!/usr/bin/env python3
"""HTTP integration tests. Own isolated anonymous session; removes only resources it creates."""
from html.parser import HTMLParser
import urllib.request,urllib.error,http.cookiejar,json,uuid,io,zipfile,pathlib,re,os,tempfile,subprocess
BASE='https://strudel.xxc.dk';cookie=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie));csrf='';created=[];created_media=[];passed=0

def request(path,method='GET',data=None,headers=None):
 h={'Origin':BASE,'User-Agent':'XXC-Strudel-Integration-Tests/1.0'};h.update(headers or {})
 if method!='GET':h.setdefault('X-CSRF-Token',csrf)
 if isinstance(data,dict):data=json.dumps(data).encode();h['Content-Type']='application/json'
 try:
  r=client.open(urllib.request.Request(BASE+path,data=data,headers=h,method=method),timeout=100);return r.status,r.headers,r.read()
 except urllib.error.HTTPError as e:return e.code,e.headers,e.read()
def j(path,method='GET',data=None):
 status,headers,raw=request('/api/'+path,method,data)
 return status,json.loads(raw)
class MetaParser(HTMLParser):
 def __init__(self):super().__init__();self.meta={}
 def handle_starttag(self,tag,attrs):
  if tag=='meta':
   attrs=dict(attrs);self.meta[attrs.get('name',attrs.get('property',''))]=attrs.get('content','')
def check(condition,label):
 global passed
 assert condition,label
 passed+=1;print('PASS',label)
def multipart(fields,filename,content,mime='audio/wav'):
 boundary='xxc-'+uuid.uuid4().hex;parts=[]
 for k,v in fields.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
 parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode()+content+b'\r\n');parts.append(f'--{boundary}--\r\n'.encode());return b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary}
try:
 status,out=j('health');check(status==200 and all(out['data'][k] for k in ['database','redis','storage','ffmpeg']),'health dependencies')
 status,out=j('session');csrf=out['data']['csrf'];check(len(csrf)==64,'session CSRF bootstrap')
 cookies=list(cookie);check(all(c.secure for c in cookies),'Secure cookies behind HTTP proxy')
 status,out=j('admin/dashboard');check(status==401,'admin authorization')
 status,headers,raw=request('/api/projects','POST',{}, {'X-CSRF-Token':'bad'});check(status==403,'incorrect CSRF token rejected')
 bad=urllib.request.Request(BASE+'/api/projects',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://example.org','User-Agent':'XXC-Strudel-Integration-Tests/1.0'},method='POST')
 try:client.open(bad);check(False,'CSRF rejection')
 except urllib.error.HTTPError as e:check(e.code==403,'CSRF rejection')
 data={'title':'Smoke test '+uuid.uuid4().hex[:8],'description':'Automated integration test','author':'Test','visibility':'private','entry_file':'main.strudel','files':[{'path':'main.strudel','content':'s("bd*4").gain(.2)'}],'metadata':{'bpm':120},'tags':['test']}
 status,out=j('projects','POST',data);check(status==201,'project create');p=out['data'];created.append(p['id'])
 other=urllib.request.build_opener();other.addheaders=[('User-Agent','XXC-Strudel-Integration-Tests/1.0')];
 try:other.open(BASE+'/api/projects/'+p['id']);check(False,'private project isolation')
 except urllib.error.HTTPError as e:check(e.code==404,'private project isolation')
 status,out=j('projects/'+p['id']);check(out['data']['files'][0]['content']==data['files'][0]['content'],'project load')
 p['files'][0]['content']='s("bd sd").gain(.3)';status,out=j('projects/'+p['id'],'PUT',p);check(status==200,'project save');updated=out['data']
 status,out=j('projects/'+p['id'],'PUT',p);check(status==409,'optimistic concurrency')
 badpath={**data,'files':[{'path':'../evil.php','content':'x'}],'entry_file':'../evil.php'};status,out=j('projects','POST',badpath);check(status==400,'path traversal rejected')
 status,out=j('projects/'+p['id']+'/revisions');check(len(out['data'])>=1,'revision checkpoint');rid=out['data'][0]['id']
 status,out=j('projects/'+p['id']+'/revisions','POST',{'id':rid,'action':'restore'});check(status==200 and 'bd*4' in out['data']['files'][0]['content'],'revision restore');p=out['data']
 payload,h=multipart({'project_id':p['id'],'license':'CC0-1.0'},'tone.wav',pathlib.Path('public/samples/tone.wav').read_bytes());status,headers,raw=request('/api/samples','POST',payload,h);out=json.loads(raw);check(status==201,'validated sample upload');sample=out['data'];created_media.append(('samples',sample['id']))
 try:other.open(BASE+'/media/'+sample['id']);check(False,'private media denies anonymous requests')
 except urllib.error.HTTPError as e:check(e.code==404,'private media denies anonymous requests')
 try:other.open(sample['url'][:-5]+'wrong');check(False,'tampered media signature rejected')
 except urllib.error.HTTPError as e:check(e.code==404,'tampered media signature rejected')
 check(other.open(sample['url']).status==200,'sandbox capability grants only approved media')
 status,headers,raw=request(sample['url'].replace(BASE,''),headers={'Range':'bytes=0-99'});check(status==206 and len(raw)==100 and headers['Content-Type']=='audio/wav','audio byte range')
 payload,h=multipart({'project_id':p['id']},'evil.php.wav',b'<?php system($_GET["x"]); ?>');status,headers,raw=request('/api/samples','POST',payload,h);check(status==415,'disguised PHP upload rejected')
 status,out=j('projects/'+p['id']+'/cover','POST',{'style':'spectral'});check(status==201,'SVG and PNG cover generation');cover=out['data'];created_media.append(('covers',cover['id']));status,headers,raw=request(cover['url'].replace(BASE,''));check(raw.startswith(b'\x89PNG'),'PNG is real PNG');status,headers,raw=request(cover['url'].replace(BASE,'')+'&format=svg');check(b'<svg' in raw,'SVG master exists')
 payload,h=multipart({'project_id':p['id']},'take.wav',pathlib.Path('public/samples/tone.wav').read_bytes());status,headers,raw=request('/api/recordings','POST',payload,h);rec=json.loads(raw)['data'];created_media.append(('recordings',rec['id']));check(status==201,'recording upload')
 for format,magic in [('wav',b'RIFF'),('mp3',b'ID3'),('m4a',None)]:
  status,out=j('exports','POST',{'recording_id':rec['id'],'format':format,'title':'Smoke','artist':'Test'});check(status==201,format+' conversion');created_media.append(('exports',out['data']['id']));status,headers,raw=request(out['data']['url'].replace(BASE,''));check((raw.startswith(magic) if magic else b'ftyp' in raw[:20]),format+' container signature')
  with tempfile.NamedTemporaryFile(suffix='.'+format) as encoded:
   encoded.write(raw);encoded.flush();probe=json.loads(subprocess.check_output(['/usr/bin/ffprobe','-v','error','-show_streams','-show_format','-of','json',encoded.name]))
   check(probe['format']['tags'].get('title')=='Smoke' and probe['format']['tags'].get('artist')=='Test',format+' title and artist metadata')
   if format!='wav':check(any(x.get('disposition',{}).get('attached_pic')==1 and x.get('codec_name')=='png' for x in probe['streams']),format+' embedded PNG artwork')
 status,out=j('projects/'+p['id']);p=out['data'];p['visibility']='unlisted';status,out=j('projects/'+p['id'],'PUT',p);p=out['data'];check(status==200,'unlisted sharing')
 status,headers,raw=request('/p/'+p['slug']);check(status==200 and b'og:image' in raw and p['title'].encode() in raw and b'og:site_name' in raw,'server rendered share metadata and site name');check(headers.get('X-Robots-Tag')=='noindex, nofollow','unlisted noindex')
 status,headers,raw=request('/sitemap.xml');check(p['slug'].encode() not in raw,'unlisted excluded from sitemap')
 p['visibility']='public';status,out=j('projects/'+p['id'],'PUT',p);p=out['data'];status,headers,raw=request('/sitemap.xml');check(p['slug'].encode() in raw,'public project in sitemap')
 status,out=j('projects/'+p['id']+'/fork','POST',{});check(status==201 and out['data']['id']!=p['id'] and out['data']['remix_of']==p['id'],'fork provenance');created.append(out['data']['id'])
 status,headers,raw=request('/api/projects/'+p['id']+'/bundle');z=zipfile.ZipFile(io.BytesIO(raw));manifest=json.loads(z.read('manifest.json'));check(manifest['format']=='xxc-strudel-project' and 'source/main.strudel' in z.namelist(),'project ZIP export')
 payload,h=multipart({},'project.zip',raw,'application/zip');status,headers,raw=request('/api/projects/import','POST',payload,h);out=json.loads(raw);check(status==201,'project ZIP import including sample');created.append(out['data']['id'])
 evil=io.BytesIO()
 with zipfile.ZipFile(evil,'w') as z:z.writestr('../evil.php','x')
 payload,h=multipart({},'evil.zip',evil.getvalue(),'application/zip');status,headers,raw=request('/api/projects/import','POST',payload,h);check(status==400,'ZIP traversal rejected')
 status,headers,raw=request('/');meta=MetaParser();meta.feed(raw.decode());public=j('settings/public')[1]['data'];check(meta.meta.get('description')==public['seo_description'] and meta.meta.get('og:description')==public['seo_description'] and meta.meta.get('og:site_name')==public['site_title'],'global SEO settings rendered in HTML');check("'unsafe-eval'" not in headers.get('Content-Security-Policy',''),'strict application CSP');status,headers,raw=request('/sandbox/');check('sandbox allow-scripts;' in headers['Content-Security-Policy'] and 'allow-same-origin' not in headers['Content-Security-Policy'],'opaque sandbox CSP')
 status,headers,raw=request('/docs/ADMIN_CREDS.md');check(status in (403,404),'private credential not publicly served')
 check(os.stat('docs/ADMIN_CREDS.md').st_mode&0o777==0o600,'admin credential permissions')
 check(all(os.stat(x).st_uid==33 for x in pathlib.Path('html').rglob('*') if x.is_file()),'public files owned by www-data')
 check(not list(pathlib.Path('html').rglob('secrets.json')),'no public secrets')
 check(not pathlib.Path('html/storage').exists(),'renderer cache remains outside web root')
 print(f'PASS {passed} backend checks')
finally:
 # Copies produced by fork/import are also owned by this isolated session.
 for route in ['samples','recordings','exports']:
  status,out=j(route)
  for media in out.get('data') or []:
   if media.get('project_id') in created:j(route+'/'+media['id'],'DELETE')
 for route,id in created_media:j(route+'/'+id,'DELETE')
 for id in reversed(created):j('projects/'+id,'DELETE')
