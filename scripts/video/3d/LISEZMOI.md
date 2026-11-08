# Vidéos 3D « le chiffre de la semaine » (8/11)
Trois.js en cel-shading (contours noirs, DA ENKLAIR), filmé image par image dans Chromium (cap.js), voix piper siwis retravaillée (voix.py), sous-titres mot par mot calés par faster-whisper (timeline.py), effets sonores et mixage (mix.py). Fichiers de travail dans /tmp/v3d (three et opentype.js par npm, serveur local python -m http.server 8765 à la racine /tmp/v3d).

Style « ENKLAIR de nuit » (8/11, validé) : micron2.html (fond noir, sol miroir, grille et lumières jaunes, bloom, verre, or). Rendu : PAGE=micron2.html node cap.js video (1,3 s par image, ~25 min) ; une scène seule : FROM=… TO=… OUT=… puis recollage par ffmpeg.
