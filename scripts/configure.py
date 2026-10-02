"""Parse xxc-db-setup output without sending credentials to stdout."""
import json,re,pathlib,secrets
p=pathlib.Path('config/secrets.json')
if p.exists():raise SystemExit('Configuration already exists; no changes made.')
s=pathlib.Path('config/db-setup.txt').read_text();host,port=re.search(r'Database host: `([^:]+):(\d+)`',s).groups()
d={k:re.search(r'Database '+v+r': `([^`]+)`',s).group(1) for k,v in [('name','name'),('user','user'),('password','pass')]};d.update(host=host,port=int(port),base_url='https://strudel.xxc.dk',app_key=secrets.token_hex(32))
p.write_text(json.dumps(d,indent=2)+'\n');p.chmod(0o640)
