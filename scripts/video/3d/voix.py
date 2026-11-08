import subprocess, numpy as np, json, sys
from faster_whisper import WhisperModel
D="/tmp/v3d/voix"; L=[l for l in open(f"{D}/lignes.txt").read().split("\n") if l.strip()]
todo=[int(x) for x in sys.argv[1:]] or list(range(1,len(L)+1))
m=WhisperModel('small',device='cpu',compute_type='int8')
try: out={o['i']:o for o in json.load(open(f"{D}/mots.json"))}
except: out={}
for i in todo:
    l=L[i-1]
    subprocess.run(['python3','-m','piper','-m','/tmp/tts/fr_FR-siwis-medium.onnx','--length-scale','0.84','--sentence-silence','0.12','--noise-scale','0.75','--noise-w','0.9','-f',f'{D}/r{i}.wav'],input=l.encode(),capture_output=True)
    subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',f'{D}/r{i}.wav','-af','silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.18:stop_threshold=-45dB,highpass=f=90,equalizer=f=220:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=4,equalizer=f=9000:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=3.5:attack=4:release=60:makeup=4,aecho=0.8:0.5:22:0.08','-ar','48000',f'{D}/l{i}.wav'])
    raw=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',f'{D}/l{i}.wav','-ar','16000','-ac','1','-f','f32le','-'],capture_output=True).stdout
    seg,_=m.transcribe(np.frombuffer(raw,dtype=np.float32),language='fr',word_timestamps=True)
    W=[(w.word.strip(),round(w.start,2),round(w.end,2)) for s in seg for w in s.words]
    d=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'{D}/l{i}.wav'],capture_output=True,text=True).stdout)
    out[i]={'i':i,'dur':d,'mots':W}; print(i,round(d,2),' '.join(w[0] for w in W))
json.dump([out[k] for k in sorted(out)],open(f"{D}/mots.json","w"),ensure_ascii=False)
