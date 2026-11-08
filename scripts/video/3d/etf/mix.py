import json, subprocess, re, os
TL=json.load(open('/tmp/etf/site/timeline.json')); at={s['id']:s['debut'] for s in TL['scenes']}
def mot(pat,n=0):
    m=[x for x in TL['mots'] if re.search(pat,x['m'])]; return m[n]['a']
ev=[('boom',0.0)]+[('whoosh',max(0,at[k]-0.05)) for k in range(2,8)]
ev+=[('pop',x) for x in [mot('1.300')-.2, mot('Nvidia')-.1, mot('Apple')-.1, mot('Microsoft')-.1, mot('TotalEnergies')-.1, mot('Safran')-.1, mot('Oréal')-.1, at[7]+.8]]
inp=[];fc=''
for i,l in enumerate(TL['lignes']): inp+=['-i',f'/tmp/etf/voix/l{l["i"]}.wav']; fc+=f'[{i}:a]adelay={int(l["t"]*1000)}|{int(l["t"]*1000)}[v{i}];'
nv=len(TL['lignes'])
for j,(n,t) in enumerate(ev):
    inp+=['-i',f'/tmp/etf/sfx/{n}.wav']; vol={'boom':0.9,'whoosh':0.35,'pop':0.35}[n]
    fc+=f'[{nv+j}:a]volume={vol},adelay={int(t*1000)}|{int(t*1000)}[s{j}];'
fc+=''.join(f'[v{i}]' for i in range(nv))+f'amix=inputs={nv}:normalize=0[vo];'+''.join(f'[s{j}]' for j in range(len(ev)))+f'amix=inputs={len(ev)}:normalize=0[sx];[vo][sx]amix=inputs=2:normalize=0,apad,atrim=0:{TL["duree"]},loudnorm=I=-14:TP=-1.5[a]'
subprocess.run(['ffmpeg','-nostdin','-v','error','-y']+inp+['-filter_complex',fc,'-map','[a]','-ar','48000','/tmp/etf/son.wav'],check=True)
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i','/tmp/etf/image.mp4','-i','/tmp/etf/son.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','/tmp/etf/f.tmp.mp4'],check=True)
os.rename('/tmp/etf/f.tmp.mp4','/tmp/etf/enklair-etf-monde.mp4'); print('ok')
