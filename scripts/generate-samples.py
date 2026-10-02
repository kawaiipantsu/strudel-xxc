"""Original procedural one-shot sample pack. CC0. Deterministic synthesis."""
import math,random,wave,struct,pathlib
random.seed(20261002); rate=44100
for name,duration in [('bd',.5),('sd',.24),('hh',.085),('oh',.38),('cp',.22),('rim',.09),('tone',1.0)]:
 samples=[]; phase=0; prev=0
 for i in range(int(rate*duration)):
  t=i/rate;n=random.uniform(-1,1);hp=n-prev;prev=n
  if name=='bd':phase+=2*math.pi*(45+120*math.exp(-t*30))/rate;v=math.sin(phase)*math.exp(-t*10)*.8
  elif name=='sd':v=(hp*.28+math.sin(2*math.pi*180*t)*.3)*math.exp(-t*20)
  elif name in ['hh','oh']:v=hp*.18*math.exp(-t*(70 if name=='hh' else 13))
  elif name=='cp':v=hp*.28*math.exp(-t*19)*(1 if t>.04 or i%500<230 else .1)
  elif name=='rim':v=(math.sin(2*math.pi*920*t)+math.sin(2*math.pi*1460*t))*.35*math.exp(-t*65)
  else:v=math.sin(2*math.pi*220*t)*min(1,t*100)*math.exp(-t*3)*.5
  samples.append(struct.pack('<h',int(max(-1,min(1,v))*32767)))
 with wave.open('public/samples/'+name+'.wav','wb') as f:f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(b''.join(samples))
# Four original single-cycle waveforms in a 2048-frame wavetable.
frames=[]
for kind in range(4):
 for i in range(2048):
  x=i/2048
  v=[math.sin(x*math.tau),2*x-1,1-4*abs(x-.5),1 if x<.5 else -1][kind]
  frames.append(struct.pack('<h',int(v*.8*32767)))
with wave.open('public/samples/xxc_wavetable.wav','wb') as f:f.setparams((1,2,44100,0,'NONE','not compressed'));f.writeframes(b''.join(frames))
pathlib.Path('public/samples/wavetables.json').write_text('{"_base":"https://strudel.xxc.dk/samples/","xxc_wt":["xxc_wavetable.wav"]}\n')
