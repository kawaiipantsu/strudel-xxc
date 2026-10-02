#!/usr/bin/env python3
"""Read-only deployed checks for system samples: mapping, serving and storage isolation."""
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://strudel.xxc.dk'
passed = 0


def check(value, label):
    global passed
    assert value, label
    passed += 1
    print('PASS', label)


def request(path, method='GET', headers=None):
    req = urllib.request.Request(BASE + path, method=method, headers={
        'User-Agent': 'XXC-Strudel-Sample-Tests/1.0', 'Origin': 'null', **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as r:
        return r.code, r.headers, r.read()


status, headers, data = request('/sample-banks/catalog.json')
check(status == 200 and headers.get('Access-Control-Allow-Origin') == '*', 'catalogue accessible to opaque runtime')
catalogue = json.loads(data)
check(catalogue['stats']['sounds'] >= 1000 and catalogue['stats']['files'] >= 6000, 'complete installed catalogue')
by_name = {s['name']: s for s in catalogue['sounds']}
check(all(k in by_name for k in ['RolandTR909_bd', 'piano', 'misc', 'breaks125', 'wt_digital', 'mridangam_ta']), 'reported missing sounds included')
url = by_name['RolandTR909_bd']['preview'].removeprefix(BASE)
status, headers, data = request(url)
check(status == 200 and data.startswith(b'RIFF') and headers['Content-Type'] == 'audio/wav', 'real drum audio served')
check(headers.get('Access-Control-Allow-Origin') == '*' and not headers.get('Set-Cookie'), 'public system audio needs no session')
check(hashlib.sha256(data).hexdigest() in url, 'served bytes match immutable content address')
check('immutable' in headers.get('Cache-Control', ''), 'content-addressed cache policy')
size = len(data)
etag = headers['ETag']
status, headers, part = request(url, headers={'Range': 'bytes=0-99'})
check(status == 206 and part == data[:100] and headers['Content-Range'] == f'bytes 0-99/{size}', 'prefix byte range')
status, headers, part = request(url, headers={'Range': 'bytes=-32'})
check(status == 206 and part == data[-32:], 'suffix byte range')
status, headers, part = request(url, headers={'Range': 'bytes=32-'})
check(status == 206 and part == data[32:], 'open-ended byte range')
for range_value in [f'bytes={size}-', 'bytes=8-3', 'bytes=-0', 'bytes=0-1,4-6', 'bytes=-']:
    status, headers, _ = request(url, headers={'Range': range_value})
    check(status == 416 and headers['Content-Range'] == f'bytes */{size}', 'invalid range: ' + range_value)
status, headers, body = request(url, 'HEAD')
check(status == 200 and not body and headers['Content-Type'] == 'audio/wav'
      and (headers.get('Content-Length') is None or int(headers['Content-Length']) == size), 'HEAD without body')
check(request(url, headers={'If-None-Match': etag})[0] == 304, 'conditional cache validation')
check(request(url, headers={'Range': 'bytes=0-2', 'If-Range': '"other"'})[0] == 200, 'If-Range mismatch returns full resource')
check(request(url, 'POST')[0] == 405, 'write methods denied')
check(request(url, 'OPTIONS')[0] == 204, 'CORS preflight')
for path in ['/sample-bank.php?file=../../config/secrets.json', '/sample-bank.php?file[]=x',
             '/sample-bank.php?file=' + '0' * 64 + '.php', '/sample-banks/audio/' + '0' * 64 + '.wav',
             '/storage/sample-banks/installed.json']:
    check(request(path)[0] in [403, 404], 'invalid/private path denied: ' + path)
check(not (ROOT / 'html/storage').exists(), 'sample files remain outside web root')
check((ROOT / 'storage/sample-banks').stat().st_uid == 0, 'PHP cannot modify installed system banks')
check(all(p.stat().st_gid == 33 and p.stat().st_mode & 0o040 for p in
          (ROOT / 'storage/sample-banks/metadata').glob('*.json')), 'installer preserves PHP group readability for every metadata file')
check((ROOT / 'docs/ADMIN_CREDS.md').stat().st_mode & 0o777 == 0o600, 'private administrator credential permissions retained')
print(f'PASS {passed} system sample checks')
