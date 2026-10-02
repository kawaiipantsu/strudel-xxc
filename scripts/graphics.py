from pathlib import Path
import math,subprocess,os,tempfile
from xml.sax.saxutils import escape
root=Path('public/brand');root.mkdir(exist_ok=True)
mark='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="3" fill="#0b1017" stroke="#ff3b47" stroke-width="2"/><path d="M14 18l11 10-11 10M30 40h19" stroke="#ff3b47" stroke-width="4" fill="none"/><path d="M30 27h4l3-10 5 18 4-8h6" fill="none" stroke="#e6ebf2" stroke-width="2"/></svg>'
(root/'mark.svg').write_text(mark)
for theme,bg,fg in [('dark','#080a0e','#e0e7ef'),('light','#f3f1e8','#202631'),('mono','#080a0e','#ffffff')]:
 logo=f'<svg xmlns="http://www.w3.org/2000/svg" width="620" height="100"><rect width="620" height="100" fill="{bg}"/><g font-family="monospace" fill="{fg}"><text x="22" y="48" font-size="31" font-weight="bold">XXC / <tspan fill="'+('#ffffff' if theme=='mono' else '#ff3b47')+'">THUGS(red)</tspan></text><text x="24" y="78" font-size="14" letter-spacing="6">STRUDEL SANDBOX ▰</text></g></svg>'
 (root/f'logo-{theme}.svg').write_text(logo)
for name,w,h in [('default-cover',1200,1200),('banner',1600,400)]:
 y=h*.54;pts=' '.join(f'{i*w/200:.1f},{y+math.sin(i*.1)*math.sin(i*.021)*h*.15:.1f}' for i in range(201))
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><rect width="100%" height="100%" fill="#080a0e"/>'
 for x in range(40,w,40):svg+=f'<path d="M{x} 0V{h}" stroke="#17202b"/>'
 for yy in range(40,h,40):svg+=f'<path d="M0 {yy}H{w}" stroke="#17202b"/>'
 svg+=f'<rect x="30" y="30" width="{w-60}" height="{h-60}" fill="none" stroke="#4e5b6f"/><polyline points="{pts}" fill="none" stroke="#ff3b47" stroke-width="3"/><g font-family="monospace"><text x="65" y="{h*.22}" font-size="22" fill="#8492a6" letter-spacing="5">[ CODE / SOUND / SIGNAL ]</text><text x="65" y="{h*.4}" font-size="{w*.052}" font-weight="bold" fill="#e3e8ee">XXC / <tspan fill="#ff3b47">THUGS(red)</tspan></text><text x="65" y="{h*.78}" font-size="{w*.032}" fill="#e3e8ee" letter-spacing="5">STRUDEL SANDBOX</text><text x="65" y="{h*.9}" font-size="15" fill="#8492a6">root@strudel:~$ make noise // keep it open ▰</text></g></svg>'
 (root/f'{name}.svg').write_text(svg)
(root/'avatar.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#131a23"/><text x="20" y="80" font-family="monospace" font-size="50" fill="#ff3b47">&gt;_</text></svg>')
(root/'empty.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="140"><path d="M20 20h260v100H20Z M40 70h220" stroke="#526073" fill="none"/><text x="64" y="62" font-family="monospace" font-size="15" fill="#ff3b47">[ AWAITING SIGNAL ]</text><text x="74" y="102" font-family="monospace" font-size="12" fill="#8795a8">&gt; write your first note</text></svg>')
(root/'loading.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><style>@media(prefers-reduced-motion:reduce){*{animation:none!important}}path{transform-origin:center;animation:r 3s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style><path d="M32 12a20 20 0 1 1-20 20a12 12 0 1 1 12 12a6 6 0 1 1 6-6" stroke="#ff3b47" fill="none" stroke-width="2"/></svg>')
# Render with librsvg: ImageMagick's internal SVG renderer mispositions text/tspans.
# Pin the same self-hosted font used by project covers; keep caches outside html/.
(root/'social.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#202731" stroke-width="1"/></pattern></defs>
<rect width="1200" height="630" fill="#080a0e"/><rect width="1200" height="630" fill="url(#grid)"/>
<rect x="32" y="32" width="1136" height="566" fill="none" stroke="#4e5b6f"/>
<path d="M64 80h28m-28 0v28M1136 550h-28m28 0v-28" fill="none" stroke="#ff3b47" stroke-width="3"/>
<g font-family="JetBrains Mono" font-weight="700">
<text x="80" y="112" fill="#a5b0c0" font-size="18" letter-spacing="2">[ CODE / SOUND / SIGNAL ]</text>
<text x="80" y="220" fill="#e3e8ee" font-size="58">XXC /</text>
<text x="302" y="220" fill="#ff3b47" font-size="58">THUGS(red)</text>
<text x="80" y="281" fill="#e3e8ee" font-size="32" letter-spacing="3">STRUDEL SANDBOX</text>
<text x="80" y="336" fill="#a5b0c0" font-size="20">Live-code music. Shape sound. Share your score.</text>
<text x="80" y="534" fill="#a5b0c0" font-size="20">strudel.xxc.dk</text>
<rect x="782" y="488" width="338" height="68" rx="3" fill="#ff3b47"/>
<text x="808" y="532" fill="#080a0e" font-size="27">OPEN STUDIO</text>
</g>
<path d="M1054 522h36m-13-13 13 13-13 13" fill="none" stroke="#080a0e" stroke-width="3"/>
<path d="M80 408h80l12-12 14 24 16-50 18 81 20-62 18 19h106l16-10 14 22 18-40 18 66 18-48 16 10h115l16-18 18 36 20-71 20 97 18-61 14 17h112l14-10 16 21 20-46 18 61 16-40 14 14h112" fill="none" stroke="#ff3b47" stroke-width="2"/>
</svg>''')
cache=Path('storage/cache/fontconfig').resolve();cache.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='xxc-graphics-') as temporary:
 config=Path(temporary)/'fonts.conf'
 config.write_text(Path('backend/fonts.conf').read_text().replace('{{FONT_DIRECTORY}}',escape(str(Path('public/fonts').resolve()))).replace('{{CACHE_DIRECTORY}}',escape(str(cache))))
 env={**os.environ,'FONTCONFIG_FILE':str(config)}
 subprocess.run(['rsvg-convert','--output',str(root/'social.png'),str(root/'social.svg')],env=env,check=True)
 # New URL ensures preview services fetch the corrected image instead of the old raster.
 (root/'social-studio.png').write_bytes((root/'social.png').read_bytes())
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png'),(32,'favicon.ico')]:subprocess.run(['convert','-background','none',str(root/'mark.svg'),'-resize',f'{size}x{size}','-define','png:exclude-chunks=date,time','public/'+name],check=True)
