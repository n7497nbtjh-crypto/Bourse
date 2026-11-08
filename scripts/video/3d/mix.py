import json, subprocess, re, os
TL=json.load(open('/tmp/v3d/site/timeline.json')); at={s['id']:s['debut'] for s in TL['scenes']}
def mot(pat,n=0):
    m=[x for x in TL['mots'] if re.search(pat,x['m'])]; return m[n]['a']
ev=[('boom',0.0),('boom',mot('plongé'))]+[('whoosh',max(0,at[k]-0.05)) for k in range(2,8)]
ev+=[('pop',x) for x in [at[3]+.9, mot('22'), at[4]+1.2, mot('1.300')-.2, mot('Micron',2)-.1, at[5]+.5, mot('2,60')-.15, at[6]+.5, mot('690')-.2, mot('690')+.7, at[7]+1.1, at[2]+.05]]
inp=[];fc=''
for i,l in enumerate(TL['lignes']): inp+=['-i',f'/tmp/v3d/voix/l{l["i"]}.wav']; fc+=f'[{i}:a]adelay={int(l["t"]*1000)}|{int(l["t"]*1000)}[v{i}];'
nv=len(TL['lignes'])
for j,(n,t) in enumerate(ev):
    inp+=['-i',f'/tmp/v3d/sfx/{n}.wav']; vol={'boom':0.9,'whoosh':0.35,'pop':0.35}[n]
    fc+=f'[{nv+j}:a]volume={vol},adelay={int(t*1000)}|{int(t*1000)}[s{j}];'
fc+=''.join(f'[v{i}]' for i in range(nv))+f'amix=inputs={nv}:normalize=0[vo];'+''.join(f'[s{j}]' for j in range(len(ev)))+f'amix=inputs={len(ev)}:normalize=0[sx];[vo][sx]amix=inputs=2:normalize=0,apad,atrim=0:{TL["duree"]},loudnorm=I=-14:TP=-1.5[a]'
subprocess.run(['ffmpeg','-nostdin','-v','error','-y']+inp+['-filter_complex',fc,'-map','[a]','-ar','48000','/tmp/v3d/son.wav'],check=True)
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i','/tmp/v3d/image.mp4','-i','/tmp/v3d/son.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','/tmp/v3d/f.tmp.mp4'],check=True)
os.rename('/tmp/v3d/f.tmp.mp4','/tmp/v3d/enklair-micron-3d.mp4'); print('ok')
