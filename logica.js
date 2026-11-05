// Logica pura del journal: nessun DOM, nessuna rete. Usata dall'app e dai test (node).
(function(root){
const pad=n=>String(n).padStart(2,"0");
const dk=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pct=v=>(v>0?"+":"")+(+v).toFixed(2).replace(".",",")+" %";
const fmtD=k=>String(k).split("-").reverse().join(".");

/* Strategie: checklist fisse, dalle parole di Lore (2026-11-04) */
const STRAT={
 xau:{n:"XAUUSD",sub:"intraday",sym:"XAUUSD",risk:.5,check:[["direzione multi-timeframe","D e 4H d'accordo","D · 4H"],["zona PRZ / supply-demand","il prezzo è in una zona, non in mezzo","4H"],["rifinitura della zona","","1H"],["evidence","reazione visibile nella zona","10'"],["fallimento e rottura","il pattern di entrata","5'"]]},
 fx:{n:"FOREX",sub:"swing",sym:"FOREX",risk:.4,check:[["direzione multi-timeframe","W e D d'accordo","W · D"],["AOI, area di interesse","","W · D · 4H"],["livello psicologico dentro la AOI","","AOI"],["evidence","","4H"],["entry","","1H"]]}
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
function rowToT(r){return{id:r.id,s:r.strategia,dir:r.direzione,d:r.data,ora:r.ora||"",ses:r.sessione||"",risk:r.rischio==null?null:+r.rischio,check:(r.checklist||[]).map(Number),conf:r.confluenze||[],prima:r.stato_prima||null,dopo:r.stato_dopo||null,piano:r.piano,res:r.esito_pct==null?null:+r.esito_pct,r:r.r==null?null:+r.r,less:r.lezione||"",tv:r.tv_link||"",imgs:r.immagini||[],open:!!r.aperto}}
function tToRow(t){const o={strategia:t.s,direzione:t.dir,data:t.d,ora:t.ora||null,sessione:t.ses||null,rischio:t.risk==null?null:+t.risk,checklist:(t.check||[]).map(x=>x?1:0),confluenze:t.conf||[],stato_prima:t.prima||null,stato_dopo:t.dopo||null,piano:t.piano==null?null:!!t.piano,esito_pct:t.res==null?null:+t.res,r:t.r==null?null:+t.r,lezione:t.less||"",tv_link:t.tv||"",immagini:t.imgs||[],aperto:!!t.open};if(t.id&&!String(t.id).startsWith("n"))o.id=t.id;return o}
function sortT(T){return T.sort((a,b)=>(a.d+(a.ora||""))<(b.d+(b.ora||""))?-1:(a.d+(a.ora||""))>(b.d+(b.ora||""))?1:0)}

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

const L={pad,dk,esc,pct,fmtD,STRAT,STATI,SK,CONF_BASE,SESS,SESSOPT,sessFor,mm,sessState,rowToT,tToRow,sortT,tvImg,allConf,closedOf,stats,splitBy,confTable,checkTable,statoTable,curve,serieP,weekOf};
if(typeof module!=="undefined"&&module.exports)module.exports=L;else root.JL=L;
})(typeof window!=="undefined"?window:globalThis);
