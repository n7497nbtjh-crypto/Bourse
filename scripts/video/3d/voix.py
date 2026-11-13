import ssl,asyncio,os,json,edge_tts,edge_tts.communicate as c
c._SSL_CTX=ssl.create_default_context(cafile=os.path.expanduser('~/.ccr/ca-bundle.crt'))
L=["Jeudi, deux mille trois cents milliards de dollars ont disparu en une seule séance.",
"La veille pourtant, Wall Street faisait la fête : les démocrates venaient de gagner le Congrès, et le Dow Jones prenait 3 %.",
"Mais jeudi, tout s'inverse. Le Nasdaq plonge de 5,5 %.",
"Les puces de l'IA sont en première ligne : Nvidia, moins 9 %. Broadcom, moins 10 %. Micron, moins 17 %.",
"Pourquoi ? Les investisseurs craignent que le nouveau Congrès freine les data centers.",
"Les résultats de Qualcomm ont déçu.","Et après une année folle, beaucoup ont vendu.",
"Prochain test : le 17 novembre, avec les résultats de Nvidia."]
async def m():
    co=edge_tts.Communicate(" ".join(L),"fr-FR-RemyMultilingualNeural",rate="+6%",boundary="WordBoundary")
    w=[];f=open("voix.mp3","wb")
    async for ch in co.stream():
        if ch["type"]=="audio": f.write(ch["data"])
        elif ch["type"]=="WordBoundary": w.append([ch["offset"]/1e7,(ch["offset"]+ch["duration"])/1e7,ch["text"]])
    json.dump(w,open("w.json","w"),ensure_ascii=False)
asyncio.run(m())
