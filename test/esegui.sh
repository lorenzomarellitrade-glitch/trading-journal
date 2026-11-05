#!/bin/sh
# Lancia tutti i test: logica in node, interfaccia in Chrome headless (3 scenari: archivio pieno, vuoto, senza sessione).
cd "$(dirname "$0")/.." || exit 1
node test/test-logica.js | tail -1 || exit 1
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=/tmp/journal-test; mkdir -p /tmp/journal-test
for sc in pieno vuoto login; do
  case $sc in pieno) pre='<script src="test/dati-finti.js"></script>';; vuoto) pre='';; login) pre='<script>window.__NO_SESSION=true</script><script src="test/dati-finti.js"></script>';; esac
  python3 - "$sc" "$pre" "$OUT" <<'PY'
import sys,re
sc,pre,out=sys.argv[1:4]
s=open('index.html').read()
s=re.sub(r'<script src="https://cdn\.jsdelivr\.net[^"]*"></script>',pre+'<script src="test/mock-supabase.js"></script>',s)
s=s.replace('<script src="config.js"></script>','')
s=s.replace('</body>','<script>setTimeout(()=>{'+open('test/test-app.js').read()+'},200)</script></body>')
open(out+'/'+sc+'.html','w').write(s)
PY
  # il file di prova sta nella cartella dell'app, così logica.js, app.js e test/ si trovano
  cp "$OUT/$sc.html" "./_test-$sc.html"
  PROF=$(mktemp -d /tmp/journal-prof.XXXXXX)
  "$CH" --headless=new --user-data-dir="$PROF" --window-size=1280,900 --virtual-time-budget=30000 --dump-dom "file://$PWD/_test-$sc.html" 2>/dev/null | python3 -c "
import sys,html,re;d=sys.stdin.read();m=re.search(r'<pre id=\"esito\">(.*?)</pre>',d,re.S)
print(html.unescape(m.group(1)) if m else 'FAIL: nessun esito (la pagina non ha finito)')"
  rm -f "./_test-$sc.html"
done
