// Logica pura del journal: nessun DOM, nessuna rete. Usata dall'app e dai test (node).
(function(root){
const pad=n=>String(n).padStart(2,"0");
const dk=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pct=v=>(v>0?"+":"")+(+v).toFixed(2).replace(".",",")+" %";
const fmtD=k=>String(k).split("-").reverse().join(".");

/* Strategie: checklist fisse, dalle parole di Lore (2026-11-04) */
const STRAT={
 xau:{n:"XAUUSD",sub:"intraday",sym:"XAUUSD",risk:2,check:[["direzione multi-timeframe","D e 4H d'accordo","D · 4H"],["zona PRZ / supply-demand","il prezzo è in una zona, non in mezzo","4H"],["rifinitura della zona","","1H"],["evidence","reazione visibile nella zona","15'"],["fallimento e rottura","il pattern di entrata","5'"]]},
 fx:{n:"FOREX",sub:"swing",sym:"FOREX",risk:2,check:[["direzione multi-timeframe","W e D d'accordo","W · D"],["AOI, area di interesse","","W · D · 4H"],["livello psicologico dentro la AOI","","AOI"],["evidence","","4H"],["entry","","1H"]]}
};
const STATI=[["lucido","presente, senza fretta"],["dubito di me","esito, cerco conferme in più"],["poco concentrato","distratto, stanco"],["ci penso troppo","analisi infinita, entro tardi"]];
const SK=STATI.map(s=>s[0]);
const CONF_BASE=["liquidità presa sopra","liquidità presa sotto","candela di rifiuto","news passata","divergenza RSI","volume in calo","terzo tocco","prima ora di Londra","contro il trend del D","ritest della rottura"];
const SESS=[["Sydney",23,8],["Tokyo",1,10],["Londra",9,18],["New York",14,23],["La mia",8,10.5],["La mia 2",16.5,19]];
const SESSOPT=["Sydney","Tokyo","Londra","Londra + New York","New York"];
function sessFor(h){if(h>=14&&h<18)return"Londra + New York";if(h>=9&&h<18)return"Londra";if(h>=18||h<1)return h>=23||h<1?"Sydney":"New York";return"Tokyo"}
const mm=h=>pad(Math.floor(h))+":"+pad(Math.round((h%1)*60));
function sessState(h){return SESS.map(([n,a,b])=>({n,a,b,on:a<b?(h>=a&&h<b):(h>=a||h<b)}))}

/* Conversione riga Supabase <-> trade in memoria */
function rowToT(r){return{id:r.id,why:r.motivo||"",s:r.strategia,dir:r.direzione,d:r.data,ora:r.ora||"",ses:r.sessione||"",risk:r.rischio==null?null:+r.rischio,check:(r.checklist||[]).map(Number),conf:r.confluenze||[],prima:r.stato_prima||null,dopo:r.stato_dopo||null,piano:r.piano,res:r.esito_pct==null?null:+r.esito_pct,r:r.r==null?null:+r.r,rr:r.rr==null?null:+r.rr,pos:posDaRiga(r.posizioni),less:r.lezione||"",tv:r.tv_link||"",imgs:r.immagini||[],open:!!r.aperto}}
function tToRow(t){const o={strategia:t.s,direzione:t.dir,data:t.d,ora:t.ora||null,sessione:t.ses||null,rischio:t.risk==null?null:+t.risk,checklist:(t.check||[]).map(x=>x?1:0),confluenze:t.conf||[],stato_prima:t.prima||null,stato_dopo:t.dopo||null,piano:t.piano==null?null:!!t.piano,esito_pct:t.res==null?null:+t.res,r:t.r==null?null:+t.r,rr:t.rr==null?null:+t.rr,posizioni:posInRiga(t.pos),lezione:t.less||"",motivo:t.why||"",tv_link:t.tv||"",immagini:t.imgs||[],aperto:!!t.open};if(t.id&&!String(t.id).startsWith("n"))o.id=t.id;return o}
function sortT(T){return T.sort((a,b)=>(a.d+(a.ora||""))<(b.d+(b.ora||""))?-1:(a.d+(a.ora||""))>(b.d+(b.ora||""))?1:0)}

/* RR e livelli (Lore, 2026-11-09): l'RR si scrive 1:2; SL e TP in % vengono dal rischio */
const r2=v=>Math.round(v*100)/100;
const num=v=>v!=null&&v!==""&&isFinite(v);
function parseRR(s){if(s==null||String(s).trim()==="")return null;const t=String(s).replace(/,/g,".").replace(/\s+/g,"");const m=/^(?:(\d+(?:\.\d+)?):)?(\d+(?:\.\d+)?)$/.exec(t);if(!m)return NaN;const a=m[1]==null?1:+m[1],b=+m[2];return a>0&&b>0&&b/a<1000?r2(b/a):NaN}
function fmtRR(rr){return num(rr)?"1:"+String(+rr).replace(".",","):""}
function livelli(risk,rr){return{sl:num(risk)?-r2(+risk):null,tp:num(risk)&&num(rr)?r2(risk*rr):null}}
function esitoDa(tipo,risk,rr){if(tipo==="be")return{res:0,r:0};if(!num(risk))return null;if(tipo==="sl")return{res:-r2(+risk),r:-1};if(tipo==="tp"&&num(rr))return{res:r2(risk*rr),r:r2(+rr)};return null}
function rDaEsito(res,risk){return num(res)&&num(risk)&&+risk!==0?r2(res/risk):null}
function tipoEsito(res,risk,rr){if(!num(res))return null;if(+res===0)return"be";const l=livelli(risk,rr);if(l.sl!=null&&r2(+res)===l.sl)return"sl";if(l.tp!=null&&r2(+res)===l.tp)return"tp";return"altro"}

/* Due posizioni (Lore, 2026-11-09): rischio diviso (di base a metà), pos. 1 a TP1 (di base 1:1), pos. 2 al TP finale (rr del trade) */
const nz=v=>num(v)?+v:null;
function posDaRiga(p){if(!p)return null;return{r1:nz(p.rischio1),rr1:nz(p.rr1),o1:p.esito1||null,o2:p.esito2||null,res2:nz(p.esito2_pct)}}
function posInRiga(p){if(!p)return null;return{rischio1:nz(p.r1),rr1:nz(p.rr1),esito1:p.o1||null,esito2:p.o2||null,esito2_pct:p.o2==="altro"?nz(p.res2):null}}
function livelli2(risk,p,rr){const r1=nz(p.r1),rt=nz(risk),q2=rt!=null&&r1!=null?r2(rt-r1):null;const a=livelli(r1,nz(p.rr1)),b=livelli(q2,nz(rr));return{r1,r2:q2,sl1:a.sl,tp1:a.tp,sl2:b.sl,tp2:b.tp,sl:rt!=null?-r2(rt):null}}
function esito2(risk,p,rr){const v=livelli2(risk,p,rr);const e1=esitoDa(p.o1,v.r1,nz(p.rr1));let e2=null;if(p.o2==="altro"){if(num(p.res2))e2={res:+p.res2}}else e2=esitoDa(p.o2,v.r2,nz(rr));if(!e1||!e2)return null;const res=r2(e1.res+e2.res);return{res,r:rDaEsito(res,risk)}}

/* Immagine di TradingView da un link "condividi" (tradingview.com/x/ID/) */
function tvImg(link){const m=/tradingview\.com\/x\/([A-Za-z0-9]+)/.exec(link||"");if(!m)return"";const id=m[1];return"https://s3.tradingview.com/snapshots/"+id[0].toLowerCase()+"/"+id+".png"}
/* Tutte le confluenze: quelle base più quelle scritte da Lore nei trade */
function allConf(T){const s=new Set(CONF_BASE);T.forEach(t=>(t.conf||[]).forEach(c=>s.add(c)));return[...s]}

/* Statistiche: sempre in % sul conto, mai in soldi */
const closedOf=(T,s)=>T.filter(t=>!t.open&&t.res!=null&&(!s||t.s===s));
function stats(list){const n=list.length;if(!n)return{n:0,w:0,l:0,wr:0,avg:0,sum:0,avgR:0,pf:0};const W=list.filter(t=>t.res>0),Ls=list.filter(t=>t.res<=0);const g=W.reduce((a,t)=>a+t.res,0),p=-Ls.reduce((a,t)=>a+t.res,0);const sum=list.reduce((a,t)=>a+t.res,0);const withR=list.filter(t=>t.r!=null);return{n,w:W.length,l:Ls.length,wr:W.length/n*100,avg:sum/n,sum,avgR:withR.length?withR.reduce((a,t)=>a+t.r,0)/withR.length:0,pf:p?g/p:(g?Infinity:0)}}
function splitBy(list,fn){const a=stats(list.filter(fn)),b=stats(list.filter(t=>!fn(t)));return{with:a,without:b,lift:(a.n&&b.n)?a.wr-b.wr:0}}
function confTable(T,s){const L=closedOf(T,s);return allConf(T).map(c=>({k:c,...splitBy(L,t=>t.conf.includes(c))})).filter(x=>x.with.n>0).sort((a,b)=>b.lift-a.lift)}
function checkTable(T,s){const L=closedOf(T,s);return STRAT[s].check.map((c,i)=>({k:c[0],tf:c[2],...splitBy(L,t=>t.check[i]===1)}))}
function statoTable(T,s){const L=closedOf(T,s);return SK.map(c=>({k:c,...stats(L.filter(t=>t.prima===c))})).filter(x=>x.n)}
function curve(list){let a=0;return list.map(t=>a+=t.res)}
function serieP(T){let n=0;for(const t of closedOf(T).slice().reverse()){if(t.piano!==false)n++;else break}return n}
function weekOf(T,today){const mon=new Date(today);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));const k=dk(mon);return T.filter(t=>!t.open&&t.d>=k)}


/* Diario di sessione (Lore, 2026-11-11): note libere per time frame, con screenshot. Oro da W a M5, Forex da W a H1 */
const TFS={xau:["W","D","H4","H1","M15","M5"],fx:["W","D","H4","H1"]};
const BIAS={up:"↑ rialzo",dn:"↓ ribasso",nt:"↔ neutro"};
function rowToN(r){return{id:r.id,s:r.strategia,d:r.data,ora:r.ora||"",tf:r.tf||null,bias:r.bias||null,txt:r.testo||"",imgs:r.immagini||[],tipo:r.tipo||"nota",sic:r.sicurezza==null?null:+r.sicurezza,piano:r.piano==null?null:!!r.piano}}
function nToRow(n){const o={strategia:n.s,data:n.d,ora:n.ora||null,tf:n.tf||null,bias:n.bias||null,testo:n.txt||"",immagini:n.imgs||[],tipo:n.tipo||"nota",sicurezza:n.sic==null?null:+n.sic,piano:n.piano==null?null:!!n.piano};if(n.id&&!String(n.id).startsWith("n"))o.id=n.id;return o}
const kOra=x=>x.ora||"99:99";
/* il flusso di un giorno: note e trade in ordine di orario; senza orario in fondo; la chiusura della sessione sempre ultima */
function flusso(N,T,s,d){const a=N.filter(n=>n.s===s&&n.d===d).map(x=>({k:x.tipo==="fine"?"fine":"nota",x})),b=T.filter(t=>t.s===s&&t.d===d).map(x=>({k:"trade",x}));return[...a,...b].map((e,i)=>({...e,i})).sort((p,q)=>(p.k==="fine")-(q.k==="fine")||(kOra(p.x)<kOra(q.x)?-1:kOra(p.x)>kOra(q.x)?1:p.i-q.i)).map(({i,...e})=>e)}
const giorni=(a,b)=>{const u=k=>{const[y,m,g]=String(k).split("-").map(Number);return Date.UTC(y,m-1,g)/864e5};return u(b)-u(a)};
/* quanto vale una lettura nel tempo: Weekly 7 giorni (oggi + 6), Daily 3 (oggi + 2), gli altri solo il giorno stesso */
const VALE={W:6,D:2};
/* con un orario: nello stesso giorno contano solo le note con un orario non successivo */
function prima(n,d,ora){return n.d<d||(n.d===d&&(!ora||(!!n.ora&&n.ora<=ora)))}
/* l'ultima lettura di ogni time frame valida per quel giorno (e quell'ora) */
function lettura(N,s,d,ora){return TFS[s].map(tf=>{const L=N.filter(n=>n.s===s&&n.tf===tf&&n.tipo!=="fine"&&prima(n,d,ora)&&giorni(n.d,d)<=(VALE[tf]||0)).sort((a,b)=>(a.d+kOra(a))<(b.d+kOra(b))?-1:1);return{tf,n:L[L.length-1]||null}})}
/* trade a favore o contro il bias di ogni time frame (solo bias rialzo/ribasso) */
function allineamento(N,T,s){const L=closedOf(T,s);return TFS[s].map(tf=>{const con=[];L.forEach(t=>{const l=lettura(N,s,t.d,t.ora).find(x=>x.tf===tf).n;if(l&&(l.bias==="up"||l.bias==="dn"))con.push({...t,_a:(l.bias==="up")===(t.dir==="long")})});return{k:tf,...splitBy(con,t=>t._a)}}).filter(x=>x.with.n+x.without.n>0)}
/* sicurezza di fine sessione (1-5) e trade di quel giorno */
function sicTable(N,T,s){const L=closedOf(T,s);return[1,2,3,4,5].map(k=>{const D=new Set(N.filter(n=>n.s===s&&n.tipo==="fine"&&n.sic===k).map(n=>n.d));return{k,giorni:D.size,...stats(L.filter(t=>D.has(t.d)))}}).filter(x=>x.giorni)}
/* testo per Sara: il diario di un periodo, con i link alle immagini */
function esportaMd(N,T,s,da,a,url){const u=p=>url&&url[p]?url[p]:p;const D=[...new Set([...N,...T].filter(x=>x.s===s&&x.d>=da&&x.d<=a).map(x=>x.d))].sort();let o="# Diario "+STRAT[s].n+" · "+fmtD(da)+" - "+fmtD(a)+"\n";
 D.forEach(d=>{o+="\n## "+fmtD(d)+"\n";flusso(N,T,s,d).forEach(({k,x})=>{const im=(x.imgs||[]).map(p=>"\n  ![]("+u(p)+")").join("");
  if(k==="nota")o+="\n- "+(x.ora||"--:--")+" · "+(x.tf||"nota")+(x.bias?" · "+BIAS[x.bias]:"")+": "+x.txt.replace(/\n/g," / ")+im;
  else if(k==="fine")o+="\n- FINE SESSIONE · sicurezza "+(x.sic==null?"-":x.sic+"/5")+" · piano "+(x.piano==null?"-":x.piano?"sì":"no")+": "+x.txt.replace(/\n/g," / ");
  else o+="\n- "+(x.ora||"--:--")+" · TRADE "+x.dir+" · rischio "+(x.risk==null?"-":x.risk+" %")+(x.rr?" · RR "+fmtRR(x.rr):"")+(x.pos?" · 2 posizioni":"")+" · "+(x.open?"aperto":"esito "+pct(x.res)+(x.r==null?"":" · "+x.r+" R")+" · piano "+(x.piano===false?"no":"sì"))+(x.why?"\n  perché: "+x.why.replace(/\n/g," / "):"")+(x.less?"\n  lezione: "+x.less.replace(/\n/g," / "):"")+(x.tv?"\n  ![]("+tvImg(x.tv)+")":"")+im})
  o+="\n"});return o}

const L={TFS,BIAS,rowToN,nToRow,flusso,giorni,lettura,allineamento,sicTable,esportaMd,pad,dk,esc,pct,fmtD,STRAT,STATI,SK,CONF_BASE,SESS,SESSOPT,sessFor,mm,sessState,rowToT,tToRow,sortT,tvImg,allConf,closedOf,stats,splitBy,confTable,checkTable,statoTable,curve,serieP,weekOf,parseRR,fmtRR,livelli,esitoDa,rDaEsito,tipoEsito,livelli2,esito2};
if(typeof module!=="undefined"&&module.exports)module.exports=L;else root.JL=L;
})(typeof window!=="undefined"?window:globalThis);
