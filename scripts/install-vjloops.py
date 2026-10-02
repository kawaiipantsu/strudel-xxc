#!/usr/bin/env python3
"""Import operator-supplied VJ packs outside the web root. No media enters Git.

All clips are normalized to bounded 720p H.264 without audio, preserving source files.
Imports retain installed clips even after their original uploads have been removed.
--check validates installed files and regenerates only the public catalogue.
"""
import argparse, hashlib, json, os, grp, subprocess, tempfile, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/vjloops'
STORE = ROOT / 'storage/vjloops'
PUBLIC = ROOT / 'public/vjloops'
GROUP = grp.getgrnam('www-data').gr_gid
RECIPE = 'h264-web-v1'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        while chunk := f.read(1024 * 1024): h.update(chunk)
    return h.hexdigest()


def protect(path, directory=False):
    path.chmod(0o750 if directory else 0o640)
    if os.geteuid() == 0: os.chown(path, 0, GROUP)


def write_json(path, data, private=True):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        f.write((json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode())
        tmp = Path(f.name)
    if private: protect(tmp)
    else: tmp.chmod(0o644)
    os.replace(tmp, path)


def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
        'stream=codec_type,codec_name,pix_fmt,width,height,avg_frame_rate:format=duration',
        '-of', 'json', str(path)], check=True, capture_output=True, timeout=30)
    return json.loads(result.stdout)


def run_ffmpeg(args):
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-threads', '2', *args],
                   check=True, capture_output=True, timeout=600)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for d in [STORE, STORE/'video', STORE/'thumb', STORE/'metadata', STORE/'tmp']:
        d.mkdir(parents=True, exist_ok=True); protect(d, True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    import fcntl
    with (STORE/'.install.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        index_path = STORE/'installed.json'
        old = json.loads(index_path.read_text()) if index_path.exists() else []
        known = {x['id']: x for x in old}
        if not args.check:
            files = sorted(p for p in SOURCE.rglob('*') if p.is_file() and not p.is_symlink() and p.suffix.lower() in ['.mp4', '.mov'])
            for i, source in enumerate(files):
                if SOURCE.resolve() not in source.resolve().parents: raise ValueError('Unexpected source path')
                original_sha = digest(source)
                clip_id = hashlib.sha256((original_sha+RECIPE).encode()).hexdigest()
                previous = known.get(clip_id)
                if previous and (STORE/'video'/previous['file']).is_file() and (STORE/'thumb'/previous['thumb']).is_file() and digest(STORE/'video'/previous['file']) == previous['sha256'] and previous.get('encoding')=='web720-crf24-3m':
                    continue
                data = probe(source)
                stream = next(s for s in data['streams'] if s['codec_type']=='video')
                duration = float(data['format']['duration'])
                if not 0 < duration <= 600: raise ValueError('Unexpected clip duration')
                file = clip_id+'.mp4'
                target = STORE/'video'/file
                temporary = STORE/'tmp'/file
                if temporary.exists(): temporary.unlink()
                # Codec labels alone missed original MP4s that stalled in WebKit.
                # Normalize every source and budget for the bounded output, not
                # another copy of the (already stored) high-bitrate original.
                reserve = 2 * 1024**3
                expected_output = int(duration * 375000) + 2 * 1024**2
                if shutil.disk_usage(STORE).free < reserve + expected_output:
                    raise ValueError('Insufficient space for conversion and application reserve')
                options = ['-vf',"scale=w='min(1280,iw)':h=-2,setsar=1", '-c:v','libx264','-preset','veryfast','-crf','24','-maxrate','3M','-bufsize','6M','-pix_fmt','yuv420p','-threads','2']
                run_ffmpeg(['-i',str(source),'-map','0:v:0','-an','-sn','-dn',*options,'-movflags','+faststart',str(temporary)])
                protect(temporary); os.replace(temporary,target)
                output = probe(target)
                video = next(s for s in output['streams'] if s['codec_type']=='video')
                thumb = clip_id+'.jpg'
                temporary_thumb = STORE/'tmp'/thumb
                run_ffmpeg(['-ss',str(min(1, duration/3)),'-i',str(target),'-frames:v','1','-vf','scale=320:-2','-q:v','5',str(temporary_thumb)])
                protect(temporary_thumb); os.replace(temporary_thumb,STORE/'thumb'/thumb)
                pack = source.relative_to(SOURCE).parts[0] if source.parent!=SOURCE else 'unfiled'
                clip = dict(id=clip_id, file=file, thumb=thumb, title=source.stem.replace('_',' ').replace('-', ' '),
                    pack=pack, duration=round(duration,3), width=video['width'], height=video['height'],
                    size=target.stat().st_size, sha256=digest(target), source_sha256=original_sha,
                    source=str(source.relative_to(SOURCE)), prepared='converted', encoding='web720-crf24-3m')
                write_json(STORE/'metadata'/(clip['file']+'.json'),dict(size=clip['size'],mime='video/mp4',etag=clip['sha256']))
                write_json(STORE/'metadata'/(clip['thumb']+'.json'),dict(size=(STORE/'thumb'/clip['thumb']).stat().st_size,mime='image/jpeg',etag=digest(STORE/'thumb'/clip['thumb'])))
                # Keep completed work resumable without publishing an incomplete catalogue.
                known[clip_id]=clip
                write_json(index_path,list(known.values()))
                print(f'{i+1}/{len(files)} prepared: {pack} / {source.stem}',flush=True)
        # Uploads are staging inputs, not the installed library's source of truth.
        # Preserve existing order and include each content ID only once.
        clips = list(known.values())
        public_clips=[]
        for clip in clips:
            video=STORE/'video'/clip['file']; thumb=STORE/'thumb'/clip['thumb']
            if not video.is_file() or video.stat().st_size!=clip['size'] or digest(video)!=clip['sha256'] or not thumb.is_file():
                raise ValueError('Missing or corrupt VJ clip; rerun the importer')
            protect(video); protect(thumb)
            write_json(STORE/'metadata'/(clip['file']+'.json'),dict(size=clip['size'],mime='video/mp4',etag=clip['sha256']))
            write_json(STORE/'metadata'/(clip['thumb']+'.json'),dict(size=thumb.stat().st_size,mime='image/jpeg',etag=digest(thumb)))
            public_clips.append({k:clip[k] for k in ['id','title','pack','duration','width','height']} | {
                'url':'/vjloops/video/'+clip['file']+'?v='+clip['sha256'][:16], 'poster':'/vjloops/thumb/'+clip['thumb']+'?v='+digest(thumb)[:16]})
        packs=[dict(id=p,name=p.replace('pack','Pack '),count=sum(c['pack']==p for c in clips),
                    credit='Beeple' if p=='pack1' else 'Operator-supplied collection') for p in sorted({c['pack'] for c in clips})]
        catalogue=dict(version=hashlib.sha256(json.dumps(public_clips,sort_keys=True).encode()).hexdigest()[:16],packs=packs,clips=public_clips)
        write_json(PUBLIC/'catalog.json',catalogue,False)
        write_json(index_path,clips)
        print(f'Installed {len(clips)} clips / {len(packs)} packs; media excluded from Git.')

if __name__=='__main__': main()
