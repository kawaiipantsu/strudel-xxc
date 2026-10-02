from pathlib import Path
import math,subprocess
root=Path('public/brand');root.mkdir(exist_ok=True)
mark='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="3" fill="#0b1017" stroke="#ff3b47" stroke-width="2"/><path d="M14 18l11 10-11 10M30 40h19" stroke="#ff3b47" stroke-width="4" fill="none"/><path d="M30 27h4l3-10 5 18 4-8h6" fill="none" stroke="#e6ebf2" stroke-width="2"/></svg>'
(root/'mark.svg').write_text(mark)
for theme,bg,fg in [('dark','#080a0e','#e0e7ef'),('light','#f3f1e8','#202631'),('mono','#080a0e','#ffffff')]:
 logo=f'<svg xmlns="http://www.w3.org/2000/svg" width="620" height="100"><rect width="620" height="100" fill="{bg}"/><g font-family="monospace" fill="{fg}"><text x="22" y="48" font-size="31" font-weight="bold">XXC / <tspan fill="'+('#ffffff' if theme=='mono' else '#ff3b47')+'">THUGS(red)</tspan></text><text x="24" y="78" font-size="14" letter-spacing="6">STRUDEL SANDBOX ▰</text></g></svg>'
 (root/f'logo-{theme}.svg').write_text(logo)
for name,w,h in [('social',1200,630),('default-cover',1200,1200),('banner',1600,400)]:
 y=h*.54;pts=' '.join(f'{i*w/200:.1f},{y+math.sin(i*.1)*math.sin(i*.021)*h*.15:.1f}' for i in range(201))
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}"><rect width="100%" height="100%" fill="#080a0e"/>'
 for x in range(40,w,40):svg+=f'<path d="M{x} 0V{h}" stroke="#17202b"/>'
 for yy in range(40,h,40):svg+=f'<path d="M0 {yy}H{w}" stroke="#17202b"/>'
 svg+=f'<rect x="30" y="30" width="{w-60}" height="{h-60}" fill="none" stroke="#4e5b6f"/><polyline points="{pts}" fill="none" stroke="#ff3b47" stroke-width="3"/><g font-family="monospace"><text x="65" y="{h*.22}" font-size="22" fill="#8492a6" letter-spacing="5">[ CODE / SOUND / SIGNAL ]</text><text x="65" y="{h*.4}" font-size="{w*.052}" font-weight="bold" fill="#e3e8ee">XXC / <tspan fill="#ff3b47">THUGS(red)</tspan></text><text x="65" y="{h*.78}" font-size="{w*.032}" fill="#e3e8ee" letter-spacing="5">STRUDEL SANDBOX</text><text x="65" y="{h*.9}" font-size="15" fill="#8492a6">root@strudel:~$ make noise // keep it open ▰</text></g></svg>'
 (root/f'{name}.svg').write_text(svg)
(root/'avatar.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#131a23"/><text x="20" y="80" font-family="monospace" font-size="50" fill="#ff3b47">&gt;_</text></svg>')
(root/'empty.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="140"><path d="M20 20h260v100H20Z M40 70h220" stroke="#526073" fill="none"/><text x="64" y="62" font-family="monospace" font-size="15" fill="#ff3b47">[ AWAITING SIGNAL ]</text><text x="74" y="102" font-family="monospace" font-size="12" fill="#8795a8">&gt; write your first note</text></svg>')
(root/'loading.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><style>@media(prefers-reduced-motion:reduce){*{animation:none!important}}path{transform-origin:center;animation:r 3s linear infinite}@keyframes r{to{transform:rotate(360deg)}}</style><path d="M32 12a20 20 0 1 1-20 20a12 12 0 1 1 12 12a6 6 0 1 1 6-6" stroke="#ff3b47" fill="none" stroke-width="2"/></svg>')
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png'),(32,'favicon.ico')]:subprocess.run(['convert','-background','none',str(root/'mark.svg'),'-resize',f'{size}x{size}','public/'+name],check=True)
subprocess.run(['convert','-background','#080a0e',str(root/'social.svg'),str(root/'social.png')],check=True)
