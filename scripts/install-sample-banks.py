#!/usr/bin/env python3
"""Install pinned Strudel sample maps and audio outside the public web root.

--update-lock is only for a deliberate catalogue refresh after reviewing sources.
Ordinary installation verifies the committed byte hashes. --check does no network IO.
"""
import argparse
import concurrent.futures
import fcntl
import grp
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.request
from urllib.parse import urlsplit, quote, unquote

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / 'config/sample-banks'
STORE = ROOT / 'storage/sample-banks'
PUBLIC = ROOT / 'public/sample-banks'
ORIGIN = 'https://strudel.xxc.dk'
MIMES = {'.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
         '.flac': 'audio/flac', '.aif': 'audio/aiff', '.aiff': 'audio/aiff'}


def source_url(base, path):
    # Upstream maps mix escaped names with literal spaces and musical sharps (#).
    return base + quote(unquote(path), safe='/')


def read(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        tmp = Path(f.name)
        f.write((json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode())
    tmp.chmod(0o640 if path.is_relative_to(STORE) else 0o644)
    if path.is_relative_to(STORE) and os.geteuid() == 0:
        os.chown(tmp, 0, grp.getgrnam('www-data').gr_gid)
    os.replace(tmp, path)


def leaves(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from leaves(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from leaves(item)
    else:
        raise ValueError('Invalid sample map')


def remap(value, fn):
    if isinstance(value, str):
        return fn(value)
    if isinstance(value, list):
        return [remap(x, fn) for x in value]
    return {key: remap(x, fn) for key, x in value.items()}


def download(url, fallback, expected, check):
    ext = Path(urlsplit(url).path).suffix.lower()
    if ext not in MIMES:
        raise ValueError('Unsupported audio format: ' + url)
    if expected:
        target = STORE / 'audio' / (expected['sha256'] + ext)
        if target.is_file() and target.stat().st_size == expected['size']:
            if hashlib.sha256(target.read_bytes()).hexdigest() == expected['sha256']:
                return expected
    if check:
        raise ValueError('Missing or corrupt installed sample: ' + url)
    errors = []
    for attempt in range(3):
        for source in dict.fromkeys([url, fallback]):
            if urlsplit(source).hostname not in ('strudel.b-cdn.net', 'raw.githubusercontent.com'):
                raise ValueError('Unexpected sample origin')
            tmp = None
            try:
                req = urllib.request.Request(source, headers={'User-Agent': 'XXC-Strudel-Sample-Installer/1.0'})
                with urllib.request.urlopen(req, timeout=45) as response:
                    if urlsplit(response.url).hostname not in ('strudel.b-cdn.net', 'raw.githubusercontent.com'):
                        raise ValueError('Unexpected redirect')
                    with tempfile.NamedTemporaryFile(dir=STORE / 'tmp', delete=False) as out:
                        tmp = Path(out.name)
                        size = 0
                        digest = hashlib.sha256()
                        while chunk := response.read(256 * 1024):
                            size += len(chunk)
                            if size > 128 * 1024 * 1024:
                                raise ValueError('Sample exceeds 128 MiB')
                            if shutil.disk_usage(STORE).free < 2 * 1024**3:
                                raise ValueError('Keep at least 2 GiB free for application storage')
                            digest.update(chunk)
                            out.write(chunk)
                sha = digest.hexdigest()
                if expected and (sha != expected['sha256'] or size != expected['size']):
                    raise ValueError('Audio differs from the committed lock')
                # Inspect the file contents; extensions and HTTP MIME alone are insufficient.
                probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
                                        '-show_entries', 'stream=codec_type', '-of', 'json', str(tmp)],
                                       capture_output=True, timeout=20, check=True)
                if not json.loads(probe.stdout).get('streams'):
                    raise ValueError('Downloaded file has no decodable audio stream')
                target = STORE / 'audio' / (sha + ext)
                tmp.chmod(0o640)
                if os.geteuid() == 0:
                    os.chown(tmp, 0, grp.getgrnam('www-data').gr_gid)
                os.replace(tmp, target)
                return dict(sha256=sha, size=size, mime=MIMES[ext], fetchedFrom=source)
            except Exception as error:
                errors.append(str(error))
            finally:
                if tmp and tmp.exists():
                    tmp.unlink()
        time.sleep(attempt + 1)
    raise ValueError(url + ': ' + ' / '.join(dict.fromkeys(errors)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-lock', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--workers', type=int, default=8)
    args = parser.parse_args()
    for folder in [STORE, STORE / 'audio', STORE / 'tmp', STORE / 'metadata', PUBLIC]:
        folder.mkdir(parents=True, exist_ok=True)
        if folder.is_relative_to(STORE):
            folder.chmod(0o750)
            if os.geteuid() == 0:
                os.chown(folder, 0, grp.getgrnam('www-data').gr_gid)
    with (STORE / '.install.lock').open('w') as guard:
        fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        sources = read(CONFIG / 'sources.json')['sources']
        fallbacks = {source_url('https://strudel.b-cdn.net/', k.removeprefix('https://strudel.b-cdn.net/')): v
                     for k, v in read(CONFIG / 'fallbacks.json').items()}
        lock = read(CONFIG / 'audio-lock.json', {})
        if not lock and not args.update_lock:
            raise ValueError('The committed audio lock is required')
        inventory = read(STORE / 'inventory.json', {}) if args.update_lock else lock
        urls = sorted({source_url(s['base'], p) for s in sources for p in leaves(read(CONFIG / s['map']))})
        if not args.update_lock and set(lock) != set(urls):
            raise ValueError('The maps and audio lock disagree; review the catalogue update')
        completed = {}
        failures = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(12, max(1, args.workers))) as pool:
            jobs = {pool.submit(download, url, fallbacks[url], inventory.get(url), args.check): url for url in urls}
            for future in concurrent.futures.as_completed(jobs):
                url = jobs[future]
                try:
                    completed[url] = future.result()
                except Exception as error:
                    failures.append(str(error))
                    print('ERROR', str(error), flush=True)
                if (len(completed) + len(failures)) % 100 == 0:
                    print(f'{len(completed)}/{len(urls)} verified; {len(failures)} failures', flush=True)
                    if args.update_lock:
                        atomic_json(STORE / 'inventory.json', {**inventory, **completed})
        if args.update_lock:
            atomic_json(STORE / 'inventory.json', {**inventory, **completed})
        if failures:
            raise ValueError(f'{len(failures)} samples failed; existing public catalogue unchanged')
        completed = dict(sorted(completed.items()))
        if args.update_lock:
            atomic_json(CONFIG / 'audio-lock.json', completed)

        def local(url):
            return ORIGIN + '/sample-banks/audio/' + completed[url]['sha256'] + Path(urlsplit(url).path).suffix.lower()

        registrations = []
        catalogue = {}
        # Fixed ordering: full Dirt bank, then the official REPL defaults overwrite shared names.
        for source in sources:
            sample_map = remap(read(CONFIG / source['map']), lambda p: local(source_url(source['base'], p)))
            registrations.append({'id': source['id'], 'map': sample_map})
            for name, bank in sample_map.items():
                variants = list(leaves(bank))
                preview = bank.get('C4', variants[0]) if isinstance(bank, dict) else variants[0]
                if isinstance(preview, list):
                    preview = preview[0]
                catalogue[name] = dict(name=name, collection=source['id'], count=len(variants), preview=preview)
        aliases = read(CONFIG / 'aliases.json')
        for name, entry in catalogue.items():
            bank, _, voice = name.partition('_')
            if bank in aliases and voice:
                entry['alias'] = aliases[bank] + '_' + voice
        for name in ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'tone']:
            key = 'tone' if name == 'tone' else 'xxc_' + name
            catalogue[key] = dict(name=key, collection='xxc', count=1, preview=ORIGIN + '/samples/' + name + '.wav')
        fingerprint = hashlib.sha256(json.dumps([registrations, aliases], sort_keys=True).encode()).hexdigest()[:16]
        unique = {r['sha256']: r['size'] for r in completed.values()}
        stats = dict(sounds=len(catalogue), files=len(unique), bytes=sum(unique.values()), version=fingerprint)
        atomic_json(PUBLIC / 'runtime.json', {'version': fingerprint, 'collections': registrations, 'aliases': aliases, 'stats': stats})
        atomic_json(PUBLIC / 'catalog.json', {
            'stats': stats,
            'collections': [{k: s[k] for k in ['id', 'name', 'license', 'author', 'repository']} for s in sources]
                + [dict(id='xxc', name='XXC originals', license='CC0-1.0', author='XXC', repository='https://github.com/kawaiipantsu/strudel-xxc')],
            'sounds': sorted(catalogue.values(), key=lambda s: s['name'].lower()),
        })
        # Only verified files become servable. The endpoint never fetches remote resources.
        allowed = {r['sha256'] + Path(urlsplit(url).path).suffix.lower(): {'size': r['size'], 'mime': r['mime']}
                   for url, r in completed.items()}
        for name, meta in allowed.items():
            atomic_json(STORE / 'metadata' / (name + '.json'), meta)
        atomic_json(STORE / 'installed.json', stats)
        print(json.dumps(stats), flush=True)


if __name__ == '__main__':
    main()
