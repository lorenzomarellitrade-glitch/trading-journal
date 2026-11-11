// Journal di Lore: interfaccia + archivio su Supabase. La logica pura sta in logica.js (JL).
(function(){
const {normCoppia,coppie,coppiaTable,filtraC,pad,dk,esc,pct,fmtD,STRAT,STATI,SK,SESSOPT,sessFor,mm,sessState,rowToT,tToRow,sortT,tvImg,allConf,closedOf,stats,confTable,checkTable,statoTable,curve,serieP,weekOf,parseRR,fmtRR,livelli,esitoDa,rDaEsito,tipoEsito,livelli2,esito2,TFS,BIAS,rowToN,nToRow,flusso,lettura,allineamento,sicTable,esportaMd,parseOra,pianoTable,accordo,pazienza,finestre,costanza,PAROLE,parole,prove,conChecklist}=window.JL;
const GG=["dom","lun","mar","mer","gio","ven","sab"], MESI=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const today=new Date(); const TK=dk(today);
const num=v=>v!=null&&v!==""&&isFinite(v);
const meta=v=>num(v)?Math.round(v/2*100)/100:null;
const nuovaPos=risk=>({r1:meta(risk),rr1:1,rr1Txt:"1:1",r1Man:false,o1:null,o2:null,res2:null});
const rrTesto=t=>t.pos?"2 posizioni · "+(fmtRR(t.pos.rr1)||"—")+" / "+(fmtRR(t.rr)||"—"):fmtRR(t.rr);
/* esito e R del trade a due posizioni, ricalcolati a ogni scelta */
function ricalcola(){if(!F||!F.pos)return;const e=esito2(F.risk,F.pos,num(F.rr)?F.rr:null);F.res=e?e.res:null;F.r=e?e.r:null}
const $=id=>document.getElementById(id);

/* ===== ARCHIVIO (Supabase) ===== */
const CFG=window.JOURNAL_CONFIG||{};
const sb=(window.supabase&&CFG.url&&CFG.anonKey)?window.supabase.createClient(CFG.url,CFG.anonKey):null;
const TAB="journal_trade", TABN="journal_nota", BUCKET="screenshot";
let N=[], T=[], USER=null, CONF=[], syncMsg="non collegato";
const urlCache={};
async function urlFor(path){if(urlCache[path])return urlCache[path];const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(path,3600);if(error||!data)return"";urlCache[path]=data.signedUrl;return data.signedUrl}
async function loadAll(){const {data,error}=await sb.from(TAB).select("*").order("data").order("ora");if(error){syncMsg="errore di lettura: "+error.message;toast("Non riesco a leggere l'archivio.");return false}T=sortT(data.map(rowToT));CONF=allConf(T);
  const rn=await sb.from(TABN).select("*").order("data").order("ora");if(rn.error){N=[];syncMsg="trade letti, diario no: "+rn.error.message;toast("Il diario non si legge: manca la tabella journal_nota?");return true}
  N=rn.data.map(rowToN);syncMsg="collegato · "+T.length+" trade · "+N.length+" note";return true}
async function saveN(n){const row=nToRow(n);const q=row.id?sb.from(TABN).update(row).eq("id",row.id):sb.from(TABN).insert(row);const {data,error}=await q.select().single();if(error){toast("Nota non salvata: "+error.message);return null}const x=rowToN(data);const i=N.findIndex(y=>y.id===x.id);i>=0?N[i]=x:N.push(x);return x}
async function delN(n){const {error}=await sb.from(TABN).delete().eq("id",n.id);if(error){toast("Non cancellata: "+error.message);return false}if(n.imgs.length)await sb.storage.from(BUCKET).remove(n.imgs);N=N.filter(x=>x.id!==n.id);return true}
async function saveT(t){const row=tToRow(t);const q=row.id?sb.from(TAB).update(row).eq("id",row.id):sb.from(TAB).insert(row);const {data,error}=await q.select().single();if(error){toast("Non salvato: "+error.message);return null}const n=rowToT(data);const i=T.findIndex(x=>x.id===n.id);i>=0?T[i]=n:T.push(n);sortT(T);CONF=allConf(T);syncMsg="collegato · "+T.length+" trade";return n}
async function delT(t){const {error}=await sb.from(TAB).delete().eq("id",t.id);if(error){toast("Non cancellato: "+error.message);return false}if(t.imgs.length)await sb.storage.from(BUCKET).remove(t.imgs);T=T.filter(x=>x.id!==t.id);CONF=allConf(T);return true}
async function uploadImg(tradeId,blob,i){const ext=(blob.type==="image/jpeg")?"jpg":blob.type==="image/webp"?"webp":"png";const path=USER.id+"/"+tradeId+"/"+Date.now()+"-"+i+"."+ext;const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:blob.type||"image/png"});if(error){toast("Screenshot non caricato: "+error.message);return null}return path}
function hydrateImgs(){document.querySelectorAll("img[data-path]").forEach(async img=>{const p=img.dataset.path;delete img.dataset.path;const u=await urlFor(p);if(u)img.src=u;else img.closest(".thumb,.im,.gal a,.shot")?.classList.add("none")})}

/* ===== GRAFICI ===== */
function area(vals,h,grid){if(vals.length<2)return`<div class="empty" style="height:${h}px;display:grid;place-items:center">la curva parte dal secondo trade chiuso</div>`;const w=600,min=Math.min(0,...vals),max=Math.max(0,...vals),sp=max-min||1;const x=i=>i/(vals.length-1)*w,y=v=>h-6-(v-min)/sp*(h-14);const pts=vals.map((v,i)=>[x(i),y(v)]);let p="M"+pts[0][0]+" "+pts[0][1];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],cx=(a[0]+b[0])/2;p+=` C${cx} ${a[1]},${cx} ${b[1]},${b[0]} ${b[1]}`}const id="g"+Math.random().toString(36).slice(2,7);const z=y(0);const gl=grid?[0,.5,1].map(k=>`<line x1="0" x2="${w}" y1="${(6+k*(h-14)).toFixed(1)}" y2="${(6+k*(h-14)).toFixed(1)}" stroke="rgba(255,255,255,.07)"/>`).join(""):"";return`<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" style="height:${h}px"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".4"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>${gl}<line x1="0" x2="${w}" y1="${z}" y2="${z}" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 5"/><path d="${p} L${w} ${h} L0 ${h}Z" fill="url(#${id})"/><path d="${p}" fill="none" stroke="var(--acc)" stroke-width="2.5"/></svg>`}
function donut(wr){const r=58,C=2*Math.PI*r;return`<svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(240,97,110,.35)" stroke-width="12"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--win)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C*wr/100} ${C}" transform="rotate(-90 70 70)"/></svg>`}
const hbar=x=>`<div class="hb ${x.with.n<8?"dimmed":x.lift>10?"good":x.lift<-10?"bad":""}"><span>${esc(x.k)}<small>${x.with.n}</small></span><div class="track"><i style="width:${x.with.wr}%"></i><em style="left:${x.without.wr}%" title="senza"></em></div><b>${x.lift>0?"+":""}${x.lift.toFixed(0)}</b></div>`;
const fR=v=>(v>0?"+":"")+(+v).toFixed(1).replace(".",",");
const nImg=t=>(t.imgs?t.imgs.length:0)+(t.tv?1:0);
const firstImg=(t,cls)=>t.imgs&&t.imgs.length?`<div class="${cls}"><img alt="" data-path="${esc(t.imgs[0])}"></div>`:t.tv?`<div class="${cls}"><img alt="" src="${esc(tvImg(t.tv))}" onerror="this.parentNode.classList.add('none');this.remove()"><span class="tag">TradingView</span></div>`:`<div class="${cls} none"><span>nessuna immagine</span></div>`;

/* ===== VISTE ===== */
function header(){$("hdDate").textContent=GG[today.getDay()]+" "+pad(today.getDate())+"."+pad(today.getMonth()+1)+" · "+(today.getHours()<12?"mattina":today.getHours()<18?"pomeriggio":"sera")}
/* ===== SESSIONE: il diario (Lore, 2026-11-11) ===== */
let sesS="xau",sesD=TK;
/* coppia del Forex che sto guardando ("" = tutte) */
let sesC="";try{sesC=normCoppia(localStorage.getItem("journal-coppia"))}catch(e){}
/* le coppie scritte a mano restano tra le pillole anche prima della prima nota */
let memC=[];try{memC=(JSON.parse(localStorage.getItem("journal-coppie")||"[]")||[]).map(normCoppia).filter(Boolean)}catch(e){}
function setC(c){sesC=normCoppia(c);if(sesC&&!memC.includes(sesC))memC.push(sesC);try{localStorage.setItem("journal-coppia",sesC);localStorage.setItem("journal-coppie",JSON.stringify(memC))}catch(e){}}
const sim=t=>t.s==="fx"&&t.c?t.c:STRAT[t.s]["sym"];
const filtrati=c=>filtraC(N,T,c);
const adesso=()=>{const d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes())};
const nuovoC=()=>({d:null,salvato:null,daCollegare:[],mode:"nota",tf:(C&&C.tf)||null,bias:null,txt:"",ora:"",pending:[],drop:[],edit:null,dir:"long",risk:STRAT[sesS].risk,rrTxt:"",pos:sesS==="fx",sic:null,piano:null,busy:false,delAsk:null});
let C=null;C=nuovoC();
function resetC(){C.pending.forEach(b=>URL.revokeObjectURL(b.url));C=nuovoC()}
function spostaGiorno(k,n){const[y,m,g]=k.split("-").map(Number);return dk(new Date(y,m-1,g+n))}
const GGL=["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
const nomeGiorno=k=>{const[y,m,g]=k.split("-").map(Number);const d=new Date(y,m-1,g);return GGL[d.getDay()]+" "+g+" "+MESI[m-1]};
const shots=(imgs)=>imgs.length?`<div class="shots">${imgs.map(p=>`<a href="#" class="shot" data-big="${esc(p)}"><img alt="" data-path="${esc(p)}"></a>`).join("")}</div>`:"";
const azioni=(id,trade)=>trade?`<span class="nact"><button type="button" data-open="${id}">modifica</button></span>`:`<span class="nact"><button type="button" data-nedit="${id}">modifica</button>${C.delAsk===id?`<button type="button" class="danger" data-ndel="${id}">sì, elimina</button>`:`<button type="button" data-ndel="${id}">elimina</button>`}</span>`;
function cardFlusso({k,x}){
  if(k==="nota")return`<div class="fe"><div class="fo">${esc(x.ora||"")}</div><div class="ncard"><div class="top">${x.c?`<span class="tfb pr">${esc(x.c)}</span>`:""}<span class="tfb">${esc(x.tf||"nota")}</span>${x.bias?`<span class="bias ${x.bias}">${BIAS[x.bias]}</span>`:""}${azioni(x.id)}</div>${x.txt?`<p>${esc(x.txt)}</p>`:""}${shots(x.imgs)}</div></div>`;
  if(k==="fine")return`<div class="fe"><div class="fo">${esc(x.ora||"")}</div><div class="ncard fine"><div class="top"><span class="tfb">FINE SESSIONE</span><span class="mini">sicurezza <b>${x.sic==null?"—":x.sic+"/5"}</b> · piano <b>${x.piano==null?"—":x.piano?"sì":"no"}</b></span>${azioni(x.id)}</div>${x.txt?`<p>${esc(x.txt)}</p>`:""}</div></div>`;
  return`<div class="fe"><div class="fo">${esc(x.ora||"")}</div><div class="ncard trade"><div class="top"><span class="tfb">TRADE</span>${x.c?`<span class="tfb pr">${esc(x.c)}</span>`:""}<b class="${x.dir==="long"?"up":"dn"}">${x.dir==="long"?"▲ long":"▼ short"}</b>${x.open?`<span class="mini">aperto</span>`:`<span class="nres ${x.res>0?"up":x.res<0?"dn":""}">${pct(x.res)}${x.r==null?"":" · "+fR(x.r)+" R"}</span>${x.piano===false?`<span class="mini">fuori piano</span>`:""}`}${azioni(x.id,true)}</div>${x.why?`<p>${esc(x.why)}</p>`:""}<div class="mini" style="margin-top:6px">rischio ${x.risk==null?"—":String(x.risk).replace(".",",")+" %"}${rrTesto(x)?" · "+rrTesto(x):""}</div>${shots(x.imgs)}${x.less?`<p class="less">${esc(x.less)}</p>`:""}${x.open?`<button type="button" class="cta sm" style="margin-top:10px" data-close="${x.id}">Chiudi il trade</button>`:""}</div></div>`;
}
function compositore(){
  const tfs=TFS[sesS],oggi=sesD===TK;
  const keep=C.edit?((N.find(n=>n.id===C.edit)||{}).imgs||[]).filter(p=>!C.drop.includes(p)):[];
  const th=[...keep.map(p=>`<span class="cth"><img alt="" data-path="${esc(p)}"><button type="button" data-crmk="${esc(p)}" aria-label="Togli">×</button></span>`),...C.pending.map((b,i)=>`<span class="cth"><img alt="" src="${b.url}"><button type="button" data-crmp="${i}" aria-label="Togli">×</button></span>`)].join("");
  const ora=`<label class="cin">${C.mode==="trade"?"entrata":"ora"}<input type="text" inputmode="numeric" autocomplete="off" class="cora" data-cora value="${esc(C.ora)}" placeholder="${oggi?"adesso":"es. 9:15"}"></label>${C.edit?`<label class="cin">giorno<input type="date" data-cdata value="${esc(C.d||sesD)}"></label>`:""}`;
  let riga,ph,bott;
  if(C.mode==="trade"){riga=`<span class="clab">trade</span><button type="button" class="chip ${C.dir==="long"?"on up":""}" data-cdir="long">▲ long</button><button type="button" class="chip ${C.dir==="short"?"on dn":""}" data-cdir="short">▼ short</button><span class="sep"></span><label class="cin">rischio %<input type="number" step="0.1" data-crisk value="${C.risk==null?"":C.risk}"></label><label class="cin">RR<input type="text" inputmode="decimal" data-crr placeholder="1:2" value="${esc(C.rrTxt)}"></label><button type="button" class="chip ${C.pos?"on":""}" data-cpos>2 posizioni</button><span class="sep"></span>${ora}`;ph="Perché entro: cosa vedo, con parole mie. Lo screenshot con ⌘V.";bott=`<button type="button" class="btn gh" data-cmode="nota">← nota</button><button type="button" class="btn pri" id="cInvia">Salva il trade · aperto</button>`}
  else if(C.mode==="fine"){riga=`<span class="clab">fine sessione</span><span class="clab">sicurezza</span>${[1,2,3,4,5].map(k=>`<button type="button" class="chip ${C.sic===k?"on":""}" data-csic="${k}">${k}</button>`).join("")}<span class="sep"></span><span class="clab">piano rispettato</span><button type="button" class="chip ${C.piano===true?"on":""}" data-cpl="1">sì</button><button type="button" class="chip ${C.piano===false?"on":""}" data-cpl="0">no</button><span class="sep"></span>${ora}`;ph="Cosa mi porto via da oggi.";bott=`<button type="button" class="btn gh" data-cmode="nota">← nota</button><button type="button" class="btn pri" id="cInvia">${C.edit?"Salva":"Chiudi la sessione"}</button>`}
  else{riga=`${tfs.map(tf=>`<button type="button" class="chip ${tf===C.tf?"on":""}" data-ctf="${tf}">${tf}</button>`).join("")}<span class="sep"></span>${Object.entries(BIAS).map(([k,v])=>`<button type="button" class="chip b ${k} ${C.bias===k?"on":""}" data-cb="${k}">${v}</button>`).join("")}<span class="sep"></span>${ora}`;ph="Cosa vedo, come lo vedo, cosa farei… (⌘V per lo screenshot)";bott=C.edit?`<button type="button" class="btn gh" id="cAnnulla">Annulla</button><button type="button" class="btn pri" id="cInvia">Salva la nota</button>`:`<button type="button" class="btn gh" data-cmode="trade">＋ Entro</button><button type="button" class="btn gh" data-cmode="fine">Chiudi sessione</button><button type="button" class="btn pri" id="cInvia">Invia</button>`}
  if(C.salvato)bott=`<button type="button" class="btn gh" id="cAnnulla">Annulla</button><button type="button" class="btn pri" id="cInvia">Riprova gli screenshot</button>`;
  else if(C.edit&&C.mode==="fine")bott=`<button type="button" class="btn gh" id="cAnnulla">Annulla</button><button type="button" class="btn pri" id="cInvia">Salva</button>`;
  return`<div class="comp" id="comp"><div class="cin2"><div class="box ${C.busy?"busy":""}">${C.salvato?`<div class="mini" style="margin-bottom:6px;color:var(--amber)">già salvato · mancano ${C.pending.length+C.daCollegare.length} screenshot: premi di nuovo per riprovare, o Annulla</div>`:C.edit?`<div class="mini" style="margin-bottom:6px">stai modificando una nota · per spostarla cambia il giorno</div>`:oggi?"":`<div class="avv" id="avvGiorno">Stai scrivendo su <b>${nomeGiorno(sesD)}</b>, non su oggi.<button type="button" data-dg="0">vai a oggi</button></div>`}<div class="crow">${sesS==="fx"&&C.mode!=="fine"?(()=>{const b=C.edit?N.find(n=>n.id===C.edit):null,c=b?b.c:sesC;return`<span class="tfb pr" data-cpair>${esc(c)||"nessuna coppia"}</span><span class="sep"></span>`})():""}${riga}</div><textarea id="cTxt" rows="2" placeholder="${ph}">${esc(C.txt)}</textarea><div class="cbot"><div class="cths">${th||`<span class="mini">⌘V incolla · trascina un'immagine · ⌘↵ invia${oggi?"":" · giorno passato: metti l'orario"}</span>`}</div><div class="cbtn">${bott}</div></div></div></div></div>`;
}
function vSess(){
  const tfs=TFS[sesS];if(!tfs.includes(C.tf))C.tf=tfs[0];
  const cF=sesS==="fx"&&sesC?sesC:null,cL=sesS==="fx"?[...new Set([...coppie(N,T),...memC,...(sesC?[sesC]:[])])]:[];
  const F=flusso(N,T,sesS,sesD).filter(e=>cF==null||!e.x.c||e.x.c===cF),lt=lettura(N,sesS,sesD,undefined,cF),tr=F.filter(e=>e.k==="trade").map(e=>e.x);
  return`<div class="sesbar enter"><div class="seg" id="mkt"><button type="button" data-sm="xau" class="${sesS==="xau"?"on":""}">XAUUSD</button><button type="button" data-sm="fx" class="${sesS==="fx"?"on":""}">FOREX</button></div>
   <div class="dnav"><button type="button" data-dg="-1" aria-label="Giorno prima">←</button><input type="date" id="sesDate" value="${sesD}"><button type="button" data-dg="1" aria-label="Giorno dopo">→</button>${sesD!==TK?`<button type="button" class="cta ghost sm" data-dg="0">oggi</button>`:""}</div></div>
  ${sesS==="fx"?`<div class="pairs enter" id="pairs"><span class="clab">coppia</span><button type="button" class="chip ${sesC?"":"on"}" data-pc="">tutte</button>${cL.map(c=>`<button type="button" class="chip ${c===sesC?"on":""}" data-pc="${esc(c)}">${esc(c)}</button>`).join("")}<input type="text" id="newPair" autocomplete="off" autocapitalize="characters" placeholder="＋ nuova, es. EURUSD"></div>`:""}
  <div class="slay enter"><div class="feed" id="feed"><div class="fday">${nomeGiorno(sesD)} · ${cF?esc(cF):STRAT[sesS].n}</div>${F.length?F.map(cardFlusso).join(""):`<div class="empty"><b>${sesD===TK?"La sessione è vuota.":"Niente scritto in questo giorno."}</b>Scegli il time frame, incolla lo screenshot e scrivi cosa vedi. Anche i giorni senza trade contano.</div>`}</div>
  <aside class="sside">
   <section class="blk"><div class="clock"><b id="clk">--:--:--</b><small id="clkSess"></small></div>${sesS==="xau"?`<div class="wins" id="win"><span data-w="La mia">8:00–10:30</span><span data-w="La mia 2">16:30–19:00</span></div>`:`<div class="note">Forex: nessuna finestra, il setup decide.</div>`}</section>
   <section class="blk"><div class="lab"><span>La mia lettura</span><span>${sesS==="fx"?(cF?esc(cF):"scegli una coppia"):"ultima nota per time frame"}</span></div><div class="mtf">${lt.map(({tf,n})=>n?`<div><b>${tf}</b><p title="${esc(n.txt)}">${esc(n.txt||"(solo immagine)")}${n.d!==sesD?` <em>· ${fmtD(n.d).slice(0,5)}</em>`:""}</p><i class="${n.bias||""}">${n.bias?BIAS[n.bias].slice(0,1):""}</i></div>`:`<div class="vuoto"><b>${tf}</b><p>ancora niente</p><i></i></div>`).join("")}</div></section>
   ${(()=>{const pt=pianoTable(T,sesS).with,ls=closedOf(T,sesS).filter(t=>t.less).slice(-1)[0];return pt.n||ls?`<section class="blk"><div class="lab"><span>Promemoria</span></div>${pt.n?`<div class="mini">Quando segui il piano: <b>${pt.wr.toFixed(0)} %</b> · R medio <b>${fR(pt.avgR)}</b> · ${pt.n} trade</div>`:""}${ls?`<p class="quote" style="font-size:13px;margin-top:10px">${esc(ls.less)}<small>${fmtD(ls.d)}</small></p>`:""}</section>`:""})()}
   <section class="blk"><div class="lab"><span>Trade del giorno</span><span>${tr.length||""}</span></div><div class="mini">${tr.length?tr.map(t=>`${esc(t.ora||"--:--")} · <b>${t.dir}</b> · ${t.open?"aperto":pct(t.res)}`).join("<br>"):"Nessun trade. Anche i giorni senza trade contano."}</div></section>
  </aside></div>${compositore()}`;
}
function redraw(focus){const y=window.scrollY;$("view").innerHTML=vSess();window.scrollTo(0,y);tickClock();hydrateImgs();if(focus){const t=$("cTxt");if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}}}
function caricaC(n){resetC();C.edit=n.id;C.mode=n.tipo==="fine"?"fine":"nota";C.tf=n.tf||C.tf;C.bias=n.bias;C.txt=n.txt;C.ora=n.ora||"";C.d=n.d;C.sic=n.sic;C.piano=n.piano}
async function caricaImg(id,list){const paths=[];for(let i=0;i<list.length;i++){const p=await uploadImg(id,list[i].blob,i);if(p)paths.push(p)}return paths}
/* salvataggio in due passi: prima la riga, poi gli screenshot. Se il secondo passo fallisce il compositore resta pieno,
   segna la riga già salvata (niente doppioni) e al prossimo Invia riprova solo gli screenshot. */
async function inviaC(){
  if(C.busy)return;const c=C;const txt=c.txt.trim();const fine=c.mode==="fine",trade=c.mode==="trade";
  if(!c.salvato&&c.mode==="nota"&&!txt&&!c.pending.length&&!c.edit){toast("Scrivi cosa vedi o incolla uno screenshot.");return}
  const oraM=parseOra(c.ora);if(Number.isNaN(oraM)){toast("Orario non valido: scrivilo tipo 9:15.");return}
  if(trade&&!c.salvato&&!oraM&&sesD!==TK){toast("Giorno passato: scrivi l'orario di entrata, tipo 9:15.");return}
  const ora=oraM||(sesD===TK?adesso():"");let rr=null;
  if(trade&&!c.salvato){rr=parseRR(c.rrTxt);if(Number.isNaN(rr)){toast("RR non valido: scrivilo tipo 1:2.");return}if(!num(c.risk)||c.risk<=0){toast("Manca il rischio.");return}}
  if(trade&&!c.salvato&&sesS==="fx"&&!sesC){toast("Scegli la coppia in alto, o scrivine una nuova (es. EURUSD).");return}
  const salva=trade?saveT:saveN,lista=()=>trade?T:N;
  c.busy=true;redraw();
  try{
    if(!c.salvato){
      let riga;
      if(trade){const [h,m]=(ora||"12:00").split(":").map(Number);riga={id:"n"+Date.now(),s:sesS,c:sesS==="fx"?sesC:"",dir:c.dir,d:sesD,ora,ses:ora?sessFor(h+m/60):"",risk:+c.risk,check:STRAT[sesS].check.map(()=>0),conf:[],prima:null,dopo:null,piano:null,res:null,r:null,rr,pos:c.pos?nuovaPos(+c.risk):null,less:"",tv:"",imgs:[],open:true,why:txt};if(riga.pos){delete riga.pos.rr1Txt;delete riga.pos.r1Man}}
      else{const base=c.edit?N.find(n=>n.id===c.edit):null;riga={id:base?base.id:"n"+Date.now(),s:base?base.s:sesS,c:base?base.c||"":(sesS==="fx"&&!fine?sesC:""),d:base?(c.d||base.d):sesD,ora:base?oraM:ora,tipo:fine?"fine":"nota",tf:fine?null:c.tf,bias:fine?null:c.bias,txt,imgs:(base?base.imgs:[]).filter(p=>!c.drop.includes(p)),sic:fine?c.sic:null,piano:fine?c.piano:null}}
      const sv=await salva(riga);if(!sv)return;
      c.salvato=sv.id;
      if(c.drop.length){const {error}=await sb.storage.from(BUCKET).remove(c.drop);if(!error)c.drop=[]}
    }
    // screenshot: quelli caricati passano in daCollegare, quelli falliti restano in pending
    const resta=[];for(let i=0;i<c.pending.length;i++){const p=await uploadImg((trade?"":"note-")+c.salvato,c.pending[i].blob,i);if(p){c.daCollegare.push(p);URL.revokeObjectURL(c.pending[i].url)}else resta.push(c.pending[i])}
    c.pending=resta;
    if(c.daCollegare.length){const cur=lista().find(x=>x.id===c.salvato);if(cur){const sv=await salva({...cur,imgs:[...cur.imgs,...c.daCollegare]});if(sv)c.daCollegare=[]}}
    if(c.pending.length||c.daCollegare.length){toast("Salvato, ma "+(c.pending.length+c.daCollegare.length)+" screenshot non sono entrati: premi di nuovo per riprovare.");return}
    const wasEdit=!!c.edit;if(C===c)resetC();
    toast(trade?"Trade salvato, aperto. Lo chiudi dalla sua scheda nel flusso.":wasEdit&&c.d&&c.d!==sesD?"Nota spostata a "+nomeGiorno(c.d)+".":wasEdit?"Nota salvata.":fine?"Sessione chiusa.":"Nota salvata.");
    c.busy=false;redraw(true);if(!wasEdit)window.scrollTo(0,document.body.scrollHeight);
  }finally{if(c.busy){c.busy=false;if(inSess())redraw()}}
}
function addC(file){if(!file||!/^image\//.test(file.type))return;C.pending.push({blob:file,url:URL.createObjectURL(file)});redraw(true)}
const inSess=()=>!!$("comp");

let calM=new Date(today.getFullYear(),today.getMonth(),1),calSel=TK;
function vCal(){
  const y=calM.getFullYear(),m=calM.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
  const byDay={},nDay={};T.forEach(t=>{(byDay[t.d]=byDay[t.d]||[]).push(t)});N.forEach(n=>{nDay[n.d]=(nDay[n.d]||0)+1});
  let cells="";for(let i=0;i<start;i++)cells+=`<div class="d off"></div>`;
  for(let d=1;d<=days;d++){const k=y+"-"+pad(m+1)+"-"+pad(d),L=byDay[k]||[],cl=L.filter(t=>!t.open&&t.res!=null),sum=cl.reduce((a,t)=>a+t.res,0);
    cells+=`<button type="button" class="d ${k===TK?"today":""} ${k===calSel?"sel":""}" data-cal="${k}" title="Diario del ${fmtD(k)}"><span>${d}</span><div class="dots">${nDay[k]?`<i class="n" title="${nDay[k]} note"></i>`:""}${L.map(t=>`<i class="${t.open?"":t.res>0?"w":"l"}"></i>`).join("")}</div>${cl.length?`<span class="r ${sum>0?"w":"l"}">${pct(sum)}</span>`:"<span></span>"}</button>`}
  const L=byDay[calSel]||[];const ms=stats(closedOf(T).filter(t=>t.d.startsWith(y+"-"+pad(m+1))));
  return `<div class="grid g-cal enter"><section class="blk"><div class="mnav"><button type="button" data-mv="-1">← ${MESI[(m+11)%12]}</button><b>${MESI[m]} ${y}</b><button type="button" data-mv="1">${MESI[(m+1)%12]} →</button></div>
   <div class="cal">${["lun","mar","mer","gio","ven","sab","dom"].map(h=>`<div class="h">${h}</div>`).join("")}${cells}</div>
   <div class="note">Tocca un giorno: si apre il diario di quel giorno, anche per scriverlo dopo. Pallino grigio = note. Mese: ${ms.n} trade chiusi · win rate ${ms.n?ms.wr.toFixed(0)+" %":"—"} · ${pct(ms.sum)}.</div></section>
  <div class="col"><section class="blk"><div class="lab"><span>${calSel===TK?"Oggi":fmtD(calSel)}</span><button type="button" class="cta ghost sm" data-newday="${calSel}">+ trade</button></div>
   <div class="trades">${L.length?L.map(t=>`<button type="button" class="tr" data-open="${t.id}"><span class="sym">${esc(sim(t))}<small>${t.ora?esc(t.ora)+" · ":""}${t.dir}${t.ses?" · "+esc(t.ses):""}</small></span><span class="tags">${esc(t.why)||"—"}</span><span class="res ${t.open?"o":t.res>0?"w":"l"}">${t.open?"aperto":pct(t.res)}<span class="st">${t.open?"":t.piano===false?"fuori piano":"piano ok"} · ${nImg(t)} img</span></span></button>`).join(""):`<div class="note" style="margin:0">Nessun trade in questo giorno.</div>`}</div></section></div></div>`;
}

/* ===== ORA E SESSIONI (ora italiana) ===== */
function tickClock(){const el=$("clk");if(!el)return;const d=new Date();el.textContent=pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
  const h=d.getHours()+d.getMinutes()/60;const st=sessState(h);const open=st.filter(x=>x.on&&!x.n.startsWith("La mia")).map(x=>x.n);const mine=st.filter(x=>x.on&&x.n.startsWith("La mia")).map(x=>x.n);
  $("clkSess").textContent=GG[d.getDay()]+" "+pad(d.getDate())+"."+pad(d.getMonth()+1)+" · "+(open.length?"aperte: "+open.join(" + "):"mercato quasi fermo");
  document.querySelectorAll("[data-w]").forEach(w=>w.classList.toggle("on",mine.includes(w.dataset.w)))}
setInterval(tickClock,1000);

/* ===== LISTA TRADE ===== */
let tView="grid",tFilt="all";
try{tView=localStorage.getItem("journal-vista")||"grid"}catch(e){}
function vTrades(){
  const L=T.slice().reverse().filter(t=>tFilt==="all"||t.s===tFilt);
  const body=!L.length?`<div class="empty"><b>Nessun trade.</b>Il primo lo registri dalla Sessione con "＋ Entro", oppure da "+ Nuovo trade".</div>`
   :tView==="list"?`<div class="tlist">${L.map(t=>`<button type="button" class="tr" data-open="${t.id}">${firstImg(t,"thumb")}<span class="sym">${esc(sim(t))}<small>${fmtD(t.d)}${t.ora?" "+esc(t.ora):""} · ${t.dir}</small></span><span class="tags">${esc(t.why)||"—"}</span><span class="res ${t.open?"o":t.res>0?"w":"l"}">${t.open?"aperto":pct(t.res)}<span class="st">${t.open?"":t.piano===false?"fuori piano":"piano ok"}</span></span></button>`).join("")}</div>`
   :`<div class="tgrid">${L.map(t=>`<button type="button" class="tcard" data-open="${t.id}">${firstImg(t,"im").replace("</div>",`<span class="res ${t.open?"o":t.res>0?"w":"l"}">${t.open?"aperto":pct(t.res)}</span></div>`)}<div class="bd"><b>${esc(sim(t))} · ${t.dir}</b><small>${fmtD(t.d)}${t.ora?" "+esc(t.ora):""}${t.ses?" · "+esc(t.ses):""}</small><small>${esc(t.why)||"—"}</small></div></button>`).join("")}</div>`;
  return`<div class="col enter"><div class="tools"><div class="seg"><button type="button" data-tf="all" class="${tFilt==="all"?"on":""}">Tutti</button><button type="button" data-tf="xau" class="${tFilt==="xau"?"on":""}">XAUUSD</button><button type="button" data-tf="fx" class="${tFilt==="fx"?"on":""}">FOREX</button></div><span class="note" style="margin:0">${L.length} trade</span><div class="seg"><button type="button" data-tv="grid" class="${tView==="grid"?"on":""}">▦ Quadrotti</button><button type="button" data-tv="list" class="${tView==="list"?"on":""}">☰ Lista</button></div></div>${body}</div>`;
}

let stS="xau";
let stC="";
function vStats(){
  const cS=stS==="fx"&&stC?stC:null,cL=stS==="fx"?coppie(N,T):[],ct=stS==="fx"&&!cS?coppiaTable(T):[];
  return vStatsDi(...filtrati(cS),cS,cL,ct);
}
function vStatsDi(N,T,cS,cL,ct){
  const L=closedOf(T,stS),s=stats(L),cv=curve(L),al=allineamento(N,T,stS),sc=sicTable(N,T,stS),pt=pianoTable(T,stS),ac=accordo(N,T,stS),pz=pazienza(N,T,stS),pw=parole(N,T,stS),pr=prove(T,stS,6),co=costanza(N,T,stS,spostaGiorno(TK,-29),TK),fi=stS==="xau"?finestre(T):null;
  const wr=x=>x.n?x.wr.toFixed(0)+" %":"—",rm=x=>x.n?fR(x.avgR)+" R":"—";
  const due=(a,la,b,lb)=>`<div class="kpis"><div class="kpi ${a.n&&b.n&&a.wr>b.wr?"good":""}"><b>${wr(a)}</b><span>${la} · ${a.n} trade · ${rm(a)}</span></div><div class="kpi"><b>${wr(b)}</b><span>${lb} · ${b.n} trade · ${rm(b)}</span></div></div>`;
  const min=v=>v==null?"—":Math.round(v)+"′";
  return `<div class="col enter">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="seg" style="width:260px"><button type="button" data-st="xau" class="${stS==="xau"?"on":""}">XAUUSD</button><button type="button" data-st="fx" class="${stS==="fx"?"on":""}">FOREX</button></div>${cL.length?`<div class="pairs" style="margin:0"><button type="button" class="chip ${cS?"":"on"}" data-stc="">tutte</button>${cL.map(c=>`<button type="button" class="chip ${c===cS?"on":""}" data-stc="${esc(c)}">${esc(c)}</button>`).join("")}</div>`:""}<span class="note" style="margin:0">${cS?esc(cS)+" · ":""}${s.n} trade chiusi · ${co.giorni} giorni di diario negli ultimi 30</span></div>
   <div class="grid g-stats">
    <section class="blk hi"><div class="lab"><span>Quando segui il piano</span><span>win rate · R medio</span></div>${pt.with.n+pt.without.n?due(pt.with,"da piano",pt.without,"fuori piano")+`<div class="note">${pt.with.n&&pt.without.n?(pt.with.wr>=pt.without.wr?"Il piano ti dà ragione: i numeri migliori arrivano quando fai il tuo.":"Per ora fuori piano va meglio: è un segnale da guardare con Sara, non da ignorare."):"Servono trade dentro e fuori piano per il confronto."}</div>`:`<div class="empty">Compare con i primi trade chiusi: alla chiusura segni se hai seguito il piano.</div>`}</section>
    <section class="blk"><div class="lab"><span>Tutti i time frame d'accordo</span><span>almeno 2 letture con bias</span></div>${ac.with.n+ac.without.n?due(ac.with,"tutti d'accordo",ac.without,"letture miste")+`<div class="note">Conta le letture rialzo/ribasso valide al momento dell'entrata.</div>`:`<div class="empty">Compare quando entri dopo aver scritto il bias su almeno due time frame.</div>`}</section>
   </div>
   ${ct.length?`<section class="blk"><div class="lab"><span>Le tue coppie</span><span>win rate · R medio · da piano</span></div><div class="hbars">${ct.map(x=>`<div class="hb ${x.wr>=55?"good":x.wr<45?"bad":""}"><span>${esc(x.k)}<small>${x.n} trade</small></span><div class="track"><i style="width:${Math.max(2,x.wr)}%"></i></div><b>${x.wr.toFixed(0)} %</b><em class="hbx">${fR(x.avgR)} R · piano ${x.daPiano}/${x.n}</em></div>`).join("")}</div><div class="note">Tocca una coppia in alto: tutte le statistiche qui sotto (piano, bias dei time frame, parole, pazienza) diventano solo di quella coppia.</div></section>`:""}
   <div class="grid g-stats">
    <section class="blk"><div class="lab"><span>Ogni time frame: trade a favore del bias</span><span>barra = a favore · tacca = contro</span></div>
     ${al.length?`<div class="hbars">${al.map(hbar).join("")}</div><div class="note">Per ogni trade chiuso conta l'ultima lettura scritta prima di entrare, con l'orario (Weekly valida 7 giorni, Daily 3, gli altri il giorno stesso); se è neutra il trade non conta. Il numero piccolo è quanti trade a favore.</div>`:`<div class="empty">Compare quando ci sono trade chiusi e, prima, note con il bias segnato.</div>`}</section>
    <section class="blk"><div class="lab"><span>Sicurezza a fine sessione</span><span>win rate di quei giorni</span></div>
      ${sc.length?`<div class="vbars">${sc.map(x=>`<div class="vb ${x.n&&x.wr>=55?"good":x.n&&x.wr<45?"bad":""}"><b>${x.n?x.wr.toFixed(0)+" %":"—"}</b><i style="height:${Math.max(6,x.n?x.wr:0)}%"></i><span>${x.k}/5<br>${x.giorni} gg · ${x.n} trade</span></div>`).join("")}</div><div class="note">Se le colonne alte sono a destra, la tua sensazione ha ragione: fidati di lei.</div>`:`<div class="empty">Chiudi la sessione con la sicurezza da 1 a 5: qui vedrai se la tua sensazione ha ragione.</div>`}</section>
   </div>
   <div class="grid g-stats">
    <section class="blk"><div class="lab"><span>Le parole della tua strategia</span><span>barra = la scrivi · tacca = no</span></div>
     ${pw.length?`<div class="hbars">${pw.map(hbar).join("")}</div><div class="note">Cerca nel "perché entro" e nelle note del giorno scritte prima di entrare. Parole: ${PAROLE[stS].map(p=>p[0]).join(", ")}. Il numero piccolo è in quanti trade compare.</div>`:`<div class="empty">Compare quando nei trade chiusi scrivi perché entri con le parole della tua strategia (${PAROLE[stS].map(p=>p[0]).join(", ")}).</div>`}</section>
    <div class="col">
     <section class="blk"><div class="lab"><span>Pazienza</span><span>minuti dalla prima nota all'entrata</span></div>${pz.nV+pz.nP?`<div class="kpis"><div class="kpi"><b>${min(pz.vinti)}</b><span>vinti · ${pz.nV}</span></div><div class="kpi"><b>${min(pz.persi)}</b><span>persi · ${pz.nP}</span></div></div><div class="note">${pz.vinti!=null&&pz.persi!=null&&pz.persi<pz.vinti?"Nei trade persi entri prima: la fretta ti costa.":"Valore centrale (mediana) dei minuti."}</div>`:`<div class="empty">Compare quando scrivi le note prima di entrare, con l'orario.</div>`}</section>
     ${fi?`<section class="blk"><div class="lab"><span>Le tue finestre</span><span>8:00–10:30 · 16:30–19:00</span></div>${fi.with.n+fi.without.n?due(fi.with,"dentro",fi.without,"fuori"):`<div class="empty">Compare con i trade chiusi sull'oro.</div>`}</section>`:""}
     <section class="blk"><div class="lab"><span>Costanza</span><span>ultimi 30 giorni</span></div><div class="kpis"><div class="kpi"><b>${co.giorni}</b><span>giorni scritti</span></div><div class="kpi"><b>${co.chiuse}</b><span>sessioni chiuse</span></div><div class="kpi"><b>${co.senzaTrade}</b><span>analizzati senza entrare</span></div></div></section>
    </div>
   </div>
   <section class="blk"><div class="lab"><span>Quando fai il tuo</span><span>da piano e andati a segno · i più recenti</span></div>
    ${pr.length?`<div class="tgrid">${pr.map(t=>`<button type="button" class="tcard" data-open="${t.id}">${firstImg(t,"im").replace("</div>",`<span class="res w">${pct(t.res)}</span></div>`)}<div class="bd"><b>${fmtD(t.d)} · ${t.dir}</b><small style="white-space:normal">${esc(t.why||t.less||"")}</small></div></button>`).join("")}</div><div class="note">Rileggili quando dubiti: sono la prova che la tua lettura funziona.</div>`:`<div class="empty">Qui si raccolgono i trade fatti come da piano e andati a segno, con lo screenshot e le tue parole.</div>`}</section>
   <div class="grid g-stats">
    <section class="blk"><div class="lab"><span>Il risultato · % sul conto</span><span>${pct(s.sum)} in totale</span></div>${area(cv,140,true)}<div class="axis"><span>${L[0]?fmtD(L[0].d):""}</span><span>${L.length?fmtD(L[L.length-1].d):""}</span></div></section>
    <div class="col">
     <section class="blk"><div class="kpis"><div class="kpi"><b>${s.n?s.wr.toFixed(0)+" %":"—"}</b><span>win rate</span></div><div class="kpi"><b>${s.n?fR(s.avgR):"—"}</b><span>R medio</span></div><div class="kpi"><b>${!s.n?"—":s.pf===Infinity?"∞":s.pf.toFixed(2).replace(".",",")}</b><span>profit factor</span></div></div></section>
     <section class="blk"><div class="lab"><span>Resoconto con Sara</span></div><div class="note" style="margin:0 0 10px">Scarica gli ultimi 30 giorni (note, trade, link alle immagini validi 7 giorni) e passa il file a Sara: lo legge con il coach di trading e ti dice che pattern vede nelle tue parole.</div><button type="button" class="cta ghost sm" data-exp>Scarica per Sara · ${STRAT[stS].n}</button></section>
    </div>
   </div>
  </div>`;
}

/* ===== NUOVO TRADE / CHIUSURA / MODIFICA: a tutto schermo ===== */
let F=null, saving=false;
function openNew(dateKey,id,mode){
  const t=id?T.find(x=>x.id===id):null;
  const nowH=today.getHours()+today.getMinutes()/60;
  const dd=dateKey||TK,oggi=dd===TK;
  F=t?JSON.parse(JSON.stringify(t)):{s:sesS,dir:"long",d:dd,ora:oggi?adesso():"",ses:oggi?sessFor(nowH):"",c:sesS==="fx"?sesC:"",risk:STRAT[sesS].risk,check:STRAT[sesS].check.map(()=>0),why:"",conf:[],prima:null,dopo:null,piano:null,res:null,r:null,rr:null,pos:null,less:"",tv:"",imgs:[],open:true,id:"n"+Date.now()};
  if(!t&&sesS==="fx")F.pos=nuovaPos(F.risk);F.mode=t?(mode||(t.open?"close":"edit")):"new";F.rrTxt=fmtRR(F.rr);if(F.pos){F.pos.rr1Txt=fmtRR(F.pos.rr1);F.pos.r1Man=true}F.out=F.mode==="close"?null:tipoEsito(F.res,F.risk,F.rr);F.pending=[];F.drop=[];F.confirmDel=false;
  renderSheet();$("sheet").scrollTop=0;
}
const stateBtns=(attr,cur)=>`<div class="states">${STATI.map(([k,d])=>`<button type="button" data-${attr}="${esc(k)}" class="${cur===k?"on":""}">${esc(k)}<small>${esc(d)}</small></button>`).join("")}</div>`;
function renderSheet(){
  const st=STRAT[F.s],M=F.mode,lv=livelli(F.risk,num(F.rr)?F.rr:null);
  const lv2=F.pos?livelli2(F.risk,F.pos,num(F.rr)?F.rr:null):null,p1ok=!F.pos||(num(F.pos.r1)&&num(F.risk)&&F.pos.r1>0&&F.pos.r1<F.risk);
  const esitoUno=()=>`<div class="big2 outs" style="margin-bottom:12px"><button type="button" data-fout="tp" class="long ${F.out==="tp"?"on":""}" ${lv.tp==null?"disabled title=\"manca l'RR\"":""}>TP preso<small>${lv.tp==null?"manca l'RR":pct(lv.tp)+" · +"+String(F.rr).replace(".",",")+" R"}</small></button><button type="button" data-fout="sl" class="short ${F.out==="sl"?"on":""}" ${lv.sl==null?"disabled":""}>SL preso<small>${lv.sl==null?"manca il rischio":pct(lv.sl)+" · -1 R"}</small></button><button type="button" data-fout="be" class="${F.out==="be"?"on":""}">pareggio<small>0 % · 0 R</small></button><button type="button" data-fout="altro" class="${F.out==="altro"?"on":""}">altro<small>chiusura a mano</small></button></div>
   <div class="row3">${F.out==="altro"?`<label class="fl">sul conto, %<input type="number" step="0.01" value="${F.res==null?"":F.res}" data-ff="res" placeholder="+0,80 o -0,50"></label><label class="fl">R${num(F.risk)?" (esito / rischio)":""}<input type="number" step="0.1" value="${F.r==null?"":F.r}" data-ff="r" placeholder="+2,1 o -1"></label>`:`<div class="fl" style="display:flex;flex-direction:column;gap:5px">esito<b class="${F.res>0?"ok":F.res<0?"no":""}" style="font-size:20px;padding:8px 0">${F.res==null?"—":pct(F.res)}${F.r==null?"":" · "+(F.r>0?"+":"")+String(F.r).replace(".",",")+" R"}</b></div><div></div>`}`;
  const rigaUno=()=>`<div class="row3" style="margin-top:12px"><label class="fl">RR<input type="text" inputmode="decimal" autocomplete="off" value="${esc(F.rrTxt||"")}" data-ff="rrTxt" placeholder="1:2" class="${Number.isNaN(F.rr)?"bad":""}"></label><label class="fl">stop loss, %<input type="text" readonly tabindex="-1" class="calc no" value="${lv.sl==null?"—":pct(lv.sl)}" data-calc="sl"></label><label class="fl">take profit, %<input type="text" readonly tabindex="-1" class="calc ok" value="${lv.tp==null?"—":pct(lv.tp)}" data-calc="tp"></label></div>${Number.isNaN(F.rr)?`<div class="note" style="margin:6px 0 0;color:var(--loss)">RR da scrivere così: 1:2 (anche 1:2,5)</div>`:""}`;
  const imgs=F.imgs.filter(p=>!F.drop.includes(p));
  const thumbs=[...imgs.map(p=>`<div><img alt="" data-path="${esc(p)}"><button type="button" data-rmimg="${esc(p)}" aria-label="Togli">×</button></div>`),...F.pending.map((b,i)=>`<div><img alt="" src="${b.url}"><button type="button" data-rmpend="${i}" aria-label="Togli">×</button></div>`)];
  const summary=`<div class="card"><h4>Il trade in sintesi</h4><div class="sum">
    <div><span>strumento</span><b>${F.s==="fx"&&normCoppia(F.c)?esc(normCoppia(F.c)):st.sym} · ${F.dir}</b></div><div><span>quando</span><b>${fmtD(F.d)}${F.ora?" · "+esc(F.ora):""}</b></div><div><span>sessione</span><b>${esc(F.ses||"—")}</b></div><div><span>rischio</span><b>${F.risk==null?"—":String(F.risk).replace(".",",")+" %"}${rrTesto({pos:F.pos,rr:num(F.rr)?F.rr:null})?" · "+rrTesto({pos:F.pos,rr:num(F.rr)?F.rr:null}):""}</b></div>
    <div><span>perché entro</span><b>${(F.why||"").trim()?"scritto":"—"}</b></div><div><span>immagini</span><b>${(imgs.length+F.pending.length+(F.tv?1:0))||"—"}</b></div>
    <div><span>prima</span><b>${esc(F.prima||"—")}</b></div>${M!=="new"?`<div><span>esito</span><b class="${F.res>0?"ok":F.res<0?"no":""}">${F.res==null?"—":pct(F.res)}</b></div>`:""}
   </div></div>`;
  const setup=`<section class="card"><h4><i>1</i>Cosa</h4>
     <div class="row2" style="margin-bottom:12px"><label class="fl">strategia<div class="big2"><button type="button" data-fs="xau" class="${F.s==="xau"?"on":""}">XAUUSD</button><button type="button" data-fs="fx" class="${F.s==="fx"?"on":""}">FOREX</button></div></label><label class="fl">direzione<div class="big2"><button type="button" data-fd="long" class="long ${F.dir==="long"?"on":""}">▲ long</button><button type="button" data-fd="short" class="short ${F.dir==="short"?"on":""}">▼ short</button></div></label></div>
     ${F.s==="fx"?`<label class="fl" style="margin-bottom:12px">coppia<input type="text" autocomplete="off" autocapitalize="characters" list="pairList" value="${esc(F.c||"")}" data-ff="c" placeholder="es. EURUSD"><datalist id="pairList">${coppie(N,T).map(c=>`<option value="${esc(c)}">`).join("")}</datalist></label>`:""}
     <div class="row3"><label class="fl">data<input type="date" value="${F.d}" data-ff="d"></label><label class="fl">orario di entrata<input type="text" inputmode="numeric" autocomplete="off" placeholder="es. 9:15" value="${esc(F.ora||"")}" data-ff="ora" class="${Number.isNaN(parseOra(F.ora))?"bad":""}"></label><label class="fl">rischio sul conto, %<input type="number" step="0.1" value="${F.risk==null?"":F.risk}" data-ff="risk"></label></div>
     <label class="fl" style="margin-top:12px">posizioni<div class="big2"><button type="button" data-fpos="1" class="${F.pos?"":"on"}">posizione unica</button><button type="button" data-fpos="2" class="${F.pos?"on":""}">due posizioni · TP1 + TP</button></div></label>
     ${F.pos?`<div class="row3" style="margin-top:12px"><label class="fl">pos. 1 · rischio %<input type="number" step="0.1" value="${F.pos.r1==null?"":F.pos.r1}" data-ff="p1r" class="${p1ok?"":"bad"}"></label><label class="fl">pos. 1 · RR<input type="text" inputmode="decimal" autocomplete="off" value="${esc(F.pos.rr1Txt||"")}" data-ff="p1rr" placeholder="1:1" class="${Number.isNaN(F.pos.rr1)?"bad":""}"></label><label class="fl">TP1, %<input type="text" readonly tabindex="-1" class="calc ok" value="${lv2.tp1==null?"—":pct(lv2.tp1)}" data-calc="tp1"></label></div>
     <div class="row3" style="margin-top:12px"><label class="fl">pos. 2 · rischio %<input type="text" readonly tabindex="-1" class="calc" value="${lv2.r2==null?"—":String(lv2.r2).replace(".",",")}" data-calc="r2"></label><label class="fl">pos. 2 · RR<input type="text" inputmode="decimal" autocomplete="off" value="${esc(F.rrTxt||"")}" data-ff="rrTxt" placeholder="1:3" class="${Number.isNaN(F.rr)?"bad":""}"></label><label class="fl">TP, %<input type="text" readonly tabindex="-1" class="calc ok" value="${lv2.tp2==null?"—":pct(lv2.tp2)}" data-calc="tp2"></label></div>
     <div class="note" style="margin:6px 0 0">stop: ${lv2.sl1==null?"—":pct(lv2.sl1)} + ${lv2.sl2==null?"—":pct(lv2.sl2)} = <span data-calc="sl">${lv2.sl==null?"—":pct(lv2.sl)}</span>${p1ok?"":` · <span style="color:var(--loss)">il rischio della pos. 1 deve stare tra 0 e il totale</span>`}${Number.isNaN(F.rr)||Number.isNaN(F.pos.rr1)?` · <span style="color:var(--loss)">RR da scrivere così: 1:2</span>`:""}</div>`:rigaUno()}
     <label class="fl" style="margin-top:12px">sessione<div class="chips">${SESSOPT.map(x=>`<button type="button" data-fse="${esc(x)}" class="${F.ses===x?"on":""}">${esc(x)}</button>`).join("")}</div></label></section>
   <section class="card"><h4><i>2</i>Perché entro<span>con parole tue</span></h4><textarea data-ff="why" placeholder="cosa vedo, perché adesso">${esc(F.why||"")}</textarea></section>
   <section class="card"><h4><i>3</i>Screenshot<span>incolla, trascina o scegli</span></h4><div class="drop" id="drop">${thumbs.length?`<div class="thumbs">${thumbs.join("")}</div>`:""}<span><kbd>⌘V</kbd> per incollare dagli appunti, trascina qui, oppure <u>scegli un file</u>.</span><input type="file" id="fileIn" accept="image/*" multiple></div>
    <label class="fl" style="margin-top:12px">link TradingView (condividi → copia link)<input type="text" value="${esc(F.tv||"")}" data-ff="tv" placeholder="https://www.tradingview.com/x/…"></label>${F.tv?`<div class="gal" style="margin-top:10px"><a href="${esc(F.tv)}" target="_blank" rel="noopener"><img alt="" src="${esc(tvImg(F.tv))}" onerror="this.outerHTML='<span class=ph>anteprima non disponibile: il link si apre in TradingView</span>'"></a></div>`:""}</section>`;
  const closing=`<section class="card"><h4><i>${M==="edit"?4:1}</i>Esito</h4>${F.pos?`<div class="note" style="margin:0 0 6px">posizione 1 · rischio ${lv2.r1==null?"—":String(lv2.r1).replace(".",",")+" %"}</div><div class="big2 outs" style="margin-bottom:12px"><button type="button" data-po1="tp" class="long ${F.pos.o1==="tp"?"on":""}" ${lv2.tp1==null?"disabled":""}>TP1 preso<small>${lv2.tp1==null?"manca l'RR":pct(lv2.tp1)}</small></button><button type="button" data-po1="sl" class="short ${F.pos.o1==="sl"?"on":""}" ${lv2.sl1==null?"disabled":""}>SL preso<small>${lv2.sl1==null?"—":pct(lv2.sl1)}</small></button><button type="button" data-po1="be" class=" ${F.pos.o1==="be"?"on":""}" ${false?"disabled":""}>pareggio<small>0 %</small></button></div><div class="note" style="margin:0 0 6px">posizione 2 · rischio ${lv2.r2==null?"—":String(lv2.r2).replace(".",",")+" %"}</div><div class="big2 outs" style="margin-bottom:12px"><button type="button" data-po2="tp" class="long ${F.pos.o2==="tp"?"on":""}" ${lv2.tp2==null?"disabled":""}>TP preso<small>${lv2.tp2==null?"manca l'RR":pct(lv2.tp2)}</small></button><button type="button" data-po2="sl" class="short ${F.pos.o2==="sl"?"on":""}" ${lv2.sl2==null?"disabled":""}>SL preso<small>${lv2.sl2==null?"—":pct(lv2.sl2)}</small></button><button type="button" data-po2="be" class=" ${F.pos.o2==="be"?"on":""}" ${false?"disabled":""}>pareggio<small>stop a pari</small></button><button type="button" data-po2="altro" class=" ${F.pos.o2==="altro"?"on":""}" ${false?"disabled":""}>altro<small>chiusura a mano</small></button></div>
   <div class="row3">${F.pos.o2==="altro"?`<label class="fl">pos. 2 · esito %<input type="number" step="0.01" value="${F.pos.res2==null?"":F.pos.res2}" data-ff="p2res" placeholder="+1,50"></label>`:`<div></div>`}<div class="fl" style="display:flex;flex-direction:column;gap:5px">esito totale<b class="${F.res>0?"ok":F.res<0?"no":""}" style="font-size:20px;padding:8px 0">${F.res==null?"—":pct(F.res)}${F.r==null?"":" · "+(F.r>0?"+":"")+String(F.r).replace(".",",")+" R"}</b></div>`:esitoUno()}<label class="fl">piano rispettato<div class="big2"><button type="button" data-fpl="1" class="${F.piano===true?"on":""}">sì</button><button type="button" data-fpl="0" class="${F.piano===false?"on":""}">no</button></div></label></div></section>
   <section class="card"><h4><i>${M==="edit"?5:2}</i>Come ero</h4><div class="row2"><div><div class="note" style="margin:0 0 8px">prima</div>${stateBtns("fp",F.prima)}</div><div><div class="note" style="margin:0 0 8px">durante e dopo</div>${stateBtns("fo",F.dopo)}</div></div></section>
   <section class="card"><h4><i>${M==="edit"?6:3}</i>La lezione<span>una riga, anche dettata</span></h4><textarea data-ff="less" placeholder="cosa dipendeva da me? cosa rifaccio uguale?">${esc(F.less)}</textarea></section>`;
  const gallery=M==="close"&&(imgs.length||F.tv)?`<section class="card"><h4>Le immagini</h4><div class="gal">${imgs.map(p=>`<a href="#" data-big="${esc(p)}"><img alt="" data-path="${esc(p)}"></a>`).join("")}${F.tv?`<a href="${esc(F.tv)}" target="_blank" rel="noopener"><img alt="" src="${esc(tvImg(F.tv))}" onerror="this.outerHTML='<span class=ph>apri in TradingView</span>'"></a>`:""}</div></section>`:"";
  const title=M==="new"?"Nuovo trade":M==="close"?"Chiudi il trade":"Il trade";
  const sub=M==="new"?"Un minuto: tutto a tocchi. Lo screenshot lo incolli con ⌘V in qualsiasi punto.":M==="close"?"Trenta secondi: esito, come sei stato, una riga di lezione.":"Tutto modificabile. Le immagini si aprono con un clic.";
  $("sheetIn").innerHTML=`<div class="top"><div><h2>${title}</h2><div class="sub">${sub}</div></div><button type="button" class="x" id="cancelSheet" aria-label="Chiudi">×</button></div>
  <main>${M==="close"?gallery+closing:M==="edit"?setup+(F.open?"":closing):setup}</main>
  <aside>${summary}<div class="acts"><button type="button" class="cta" id="saveSheet">${M==="new"?"Salva · trade aperto":M==="close"?"Salva e chiudi il trade":"Salva le modifiche"}</button>${M==="close"?`<button type="button" class="cta ghost" data-editopen="${F.id}">Modifica i dati di entrata</button>`:""}${M==="edit"&&!F.open?`<button type="button" class="cta ghost" id="reopen">Riapri il trade</button>`:""}<button type="button" class="cta ghost" id="cancelSheet2">Annulla</button>${M!=="new"?(F.confirmDel?`<button type="button" class="cta ghost danger" id="delYes">Sì, elimina per sempre</button>`:`<button type="button" class="cta ghost" id="delAsk" style="color:var(--dim)">Elimina il trade</button>`):`<div class="note" style="text-align:center;margin:0">l'esito lo metti quando chiude</div>`}</div></aside>`;
  $("sheet").hidden=false;hydrateImgs();
}
function closeSheet(){F&&F.pending.forEach(b=>URL.revokeObjectURL(b.url));$("sheet").hidden=true;F=null;if(location.hash==="#nuovo")history.replaceState(null,"","#sessione")}
function addPending(file){if(!F||!/^image\//.test(file.type))return;F.pending.push({blob:file,url:URL.createObjectURL(file)});renderSheet()}
async function commitSheet(){
  if(saving)return;const M=F.mode;
  {const o=parseOra(F.ora);if(Number.isNaN(o)){toast("Orario non valido: scrivilo tipo 9:15.");return}F.ora=o}
  F.c=F.s==="fx"?normCoppia(F.c):"";
  if(Number.isNaN(F.rr)||(F.pos&&Number.isNaN(F.pos.rr1))){toast("RR non valido: scrivilo tipo 1:2.");return}
  if(F.pos&&!(num(F.pos.r1)&&num(F.risk)&&F.pos.r1>0&&F.pos.r1<F.risk)){toast("Il rischio della posizione 1 deve stare tra 0 e il totale.");return}
  if((M==="close"||(M==="edit"&&!F.open))&&(F.res==null||isNaN(F.res))){toast("Manca l'esito: TP, SL, pareggio o altro.");return}
  saving=true;$("saveSheet").classList.add("busy");
  const t={...F};delete t.mode;delete t.pending;delete t.drop;delete t.confirmDel;delete t.rrTxt;delete t.out;
  if(M==="close"){t.open=false;if(t.r==null)t.r=rDaEsito(t.res,t.risk);if(t.r==null)t.r=t.res>0?2:-1;if(t.piano==null)t.piano=true}
  if(M==="edit"&&F.reopen){t.open=true}
  if(F.drop.length)t.imgs=t.imgs.filter(p=>!F.drop.includes(p));
  let saved=await saveT(t);
  if(saved&&F.drop.length)await sb.storage.from(BUCKET).remove(F.drop);
  if(saved&&F.pending.length){const paths=[];for(let i=0;i<F.pending.length;i++){const p=await uploadImg(saved.id,F.pending[i].blob,i);if(p)paths.push(p)}if(paths.length){saved=await saveT({...saved,imgs:[...saved.imgs,...paths]})}}
  saving=false;
  if(!saved){$("saveSheet").classList.remove("busy");return}
  calSel=saved.d;toast(M==="new"?"Trade salvato, aperto. Lo chiudi quando chiude.":M==="close"?"Trade chiuso: "+pct(saved.res)+".":"Modifiche salvate.");
  closeSheet();route();
}

const VIEWS={sessione:vSess,calendario:vCal,trade:vTrades,statistiche:vStats};
function route(){if(!USER)return;header();const v=(location.hash||"#sessione").slice(1);if(v==="nuovo"&&!F)openNew(TK);const fn=VIEWS[v]||vSess;$("view").innerHTML=fn();document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.v===(VIEWS[v]?v:"sessione")));window.scrollTo(0,0);tickClock();hydrateImgs()}
async function esporta(){const da=spostaGiorno(TK,-30);const paths=[...N,...T].filter(x=>x.s===stS&&x.d>=da).flatMap(x=>x.imgs||[]);const url={};
  if(paths.length){const {data,error}=await sb.storage.from(BUCKET).createSignedUrls(paths,7*86400);if(error||!data){toast("Non riesco a preparare i link alle immagini: riprova tra poco.");return}(data||[]).forEach(r=>{if(r&&r.signedUrl)url[r.path]=r.signedUrl});}const mancano=paths.filter(p=>!url[p]).length;
  const md=esportaMd(N,T,stS,da,TK,url);const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([md],{type:"text/markdown"}));a.download="diario-"+(stS==="xau"?"xauusd":"forex")+"-"+TK+".md";document.body.appendChild(a);a.click();a.remove();window.__ultimoExport=md;toast(mancano?"Scaricato, ma "+mancano+" immagini sono senza link.":"Scaricato: passalo a Sara.")}
let tt;function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,3000)}
function setPal(p){p==="verde"?document.documentElement.removeAttribute("data-pal"):document.documentElement.setAttribute("data-pal","mono");try{localStorage.setItem("journal-pal",p)}catch(e){}document.querySelectorAll("#pop [data-pal]").forEach(b=>b.classList.toggle("on",b.dataset.pal===p))}

document.addEventListener("click",async e=>{
  const q=s=>e.target.closest(s);
  if(q("#gearBtn")){const p=$("pop");p.hidden=!p.hidden;$("syncSt").textContent=syncMsg;$("who").textContent=USER?USER.email:"";setPal(document.documentElement.getAttribute("data-pal")==="mono"?"mono":"verde");return}
  if(!q("#pop")&&!$("pop").hidden)$("pop").hidden=true;
  const pl=q("#pop [data-pal]");if(pl){setPal(pl.dataset.pal);return}
  if(q("#logoutBtn")){await sb.auth.signOut();return}
  if(q("#newBtn")){openNew(inSess()?sesD:TK);return}
  const nd=q("[data-newday]");if(nd){openNew(nd.dataset.newday);return}
  const cl=q("[data-close]");if(cl){openNew(null,cl.dataset.close,"close");return}
  const tr=q("[data-open]");if(tr){openNew(null,tr.dataset.open);return}
  const big0=q("[data-big]");if(big0){e.preventDefault();const u=await urlFor(big0.dataset.big);if(u)window.open(u,"_blank");return}
  const cal=q("[data-cal]");if(cal){calSel=cal.dataset.cal;sesD=calSel;resetC();location.hash="#sessione";return}
  if(inSess()&&!F&&C.busy&&q("#view button"))return;
  if(inSess()&&!F){
   const pc=q("[data-pc]");if(pc){setC(pc.dataset.pc);redraw();return}
   const sm=q("[data-sm]");if(sm){sesS=sm.dataset.sm;resetC();C.tf=TFS[sesS][0];redraw();return}
   const dg=q("[data-dg]");if(dg){sesD=+dg.dataset.dg===0?TK:spostaGiorno(sesD,+dg.dataset.dg);resetC();redraw();return}
   const ctf=q("[data-ctf]");if(ctf){C.tf=ctf.dataset.ctf;redraw(true);return}
   const cb=q("[data-cb]");if(cb){C.bias=C.bias===cb.dataset.cb?null:cb.dataset.cb;redraw(true);return}
   const cm=q("[data-cmode]");if(cm){C.mode=cm.dataset.cmode;redraw(true);return}
   const cd=q("[data-cdir]");if(cd){C.dir=cd.dataset.cdir;redraw(true);return}
   if(q("[data-cpos]")){C.pos=!C.pos;redraw(true);return}
   const cs=q("[data-csic]");if(cs){C.sic=C.sic===+cs.dataset.csic?null:+cs.dataset.csic;redraw(true);return}
   const cp=q("[data-cpl]");if(cp){C.piano=cp.dataset.cpl==="1";redraw(true);return}
   const rp=q("[data-crmp]");if(rp){const b=C.pending.splice(+rp.dataset.crmp,1)[0];URL.revokeObjectURL(b.url);redraw(true);return}
   const rk=q("[data-crmk]");if(rk){C.drop.push(rk.dataset.crmk);redraw(true);return}
   if(q("#cInvia")){await inviaC();return}
   if(q("#cAnnulla")){resetC();redraw();return}
   const ne=q("[data-nedit]");if(ne){const n=N.find(x=>x.id===ne.dataset.nedit);if(n){caricaC(n);redraw(true)}return}
   const nd=q("[data-ndel]");if(nd){const id=nd.dataset.ndel;if(C.delAsk!==id){C.delAsk=id;redraw();return}const n=N.find(x=>x.id===id);if(n&&await delN(n)){toast("Nota eliminata.");if(C.edit===id)resetC();C.delAsk=null;redraw()}return}
  }
  if(q("[data-exp]")){await esporta();return}
  const mv=q("[data-mv]");if(mv){calM.setMonth(calM.getMonth()+ +mv.dataset.mv);route();return}
  const st=q("[data-st]");if(st){stS=st.dataset.st;route();return}
  const stc=q("[data-stc]");if(stc){stC=stc.dataset.stc;route();return}
  const tv=q("[data-tv]");if(tv){tView=tv.dataset.tv;try{localStorage.setItem("journal-vista",tView)}catch(x){}route();return}
  const tf=q("[data-tf]");if(tf){tFilt=tf.dataset.tf;route();return}
  if(!F)return;
  const eo=q("[data-editopen]");if(eo){openNew(null,eo.dataset.editopen,"edit");return}
  const fs=q("[data-fs]");if(fs){F.s=fs.dataset.fs;if(F.mode==="new"){F.risk=STRAT[F.s].risk;F.pos=F.s==="fx"?nuovaPos(F.risk):null}F.check=STRAT[F.s].check.map(()=>0);renderSheet();return}
  const fd=q("[data-fd]");if(fd){F.dir=fd.dataset.fd;renderSheet();return}
  const fse=q("[data-fse]");if(fse){F.ses=fse.dataset.fse;renderSheet();return}
  const fp=q("[data-fp]");if(fp){F.prima=fp.dataset.fp;renderSheet();return}
  const fo=q("[data-fo]");if(fo){F.dopo=fo.dataset.fo;renderSheet();return}
  const fpos=q("[data-fpos]");if(fpos){F.pos=fpos.dataset.fpos==="2"?(F.pos||nuovaPos(F.risk)):null;F.out=null;if(F.mode!=="new"){F.res=null;F.r=null}ricalcola();renderSheet();return}
  const po=q("[data-po1],[data-po2]");if(po&&F.pos){if(po.disabled)return;if(po.dataset.po1)F.pos.o1=po.dataset.po1;else F.pos.o2=po.dataset.po2;ricalcola();renderSheet();return}
  const fout=q("[data-fout]");if(fout){if(fout.disabled)return;F.out=fout.dataset.fout;if(F.out==="altro"){if(F.res==null)F.r=null}else{const x=esitoDa(F.out,F.risk,num(F.rr)?F.rr:null);if(x){F.res=x.res;F.r=x.r}}renderSheet();return}
  const fpl=q("[data-fpl]");if(fpl){F.piano=fpl.dataset.fpl==="1";renderSheet();return}
  const ri=q("[data-rmimg]");if(ri){F.drop.push(ri.dataset.rmimg);renderSheet();return}
  const rp=q("[data-rmpend]");if(rp){const b=F.pending.splice(+rp.dataset.rmpend,1)[0];URL.revokeObjectURL(b.url);renderSheet();return}
  if(q("#drop")&&!q("button")&&!q("img")){$("fileIn").click();return}
  if(q("#reopen")){F.reopen=true;F.open=true;await commitSheet();return}
  if(q("#delAsk")){F.confirmDel=true;renderSheet();return}
  if(q("#delYes")){const t=T.find(x=>x.id===F.id);if(t&&await delT(t)){toast("Trade eliminato.");closeSheet();route()}return}
  if(q("#cancelSheet")||q("#cancelSheet2")||e.target.id==="sheet"){closeSheet();return}
  if(q("#saveSheet")){await commitSheet();return}
});
document.addEventListener("change",e=>{if(e.target.id==="fileIn"&&F){[...e.target.files].forEach(addPending)}if(e.target.id==="newPair"&&e.target.isConnected){nuovaCoppia(e.target);return}if(e.target.id==="sesDate"&&e.target.value){sesD=e.target.value;resetC();redraw()}});
document.addEventListener("input",e=>{const g=e.target;if(g.id==="cTxt"){C.txt=g.value;return}if(g.hasAttribute("data-cora")){C.ora=g.value;return}if(g.hasAttribute("data-cdata")){if(g.value)C.d=g.value;return}if(g.hasAttribute("data-crisk")){C.risk=g.value===""?null:+g.value;return}if(g.hasAttribute("data-crr")){C.rrTxt=g.value;return}
  if(!F)return;const f=e.target.dataset.ff;if(!f)return;const v=e.target.value;if(f==="res"||f==="r"||f==="risk")F[f]=v===""?null:+v;else F[f]=v;if(f==="rrTxt")F.rr=parseRR(v);if(f==="res"&&!F.pos)F.r=rDaEsito(F.res,F.risk);if(F.pos){if(f==="p1r"){F.pos.r1=v===""?null:+v;F.pos.r1Man=true}if(f==="p1rr"){F.pos.rr1Txt=v;F.pos.rr1=parseRR(v)}if(f==="p2res")F.pos.res2=v===""?null:+v;if(f==="risk"&&!F.pos.r1Man)F.pos.r1=meta(F.risk);ricalcola()}
  else if((f==="risk"||f==="rrTxt")&&F.out&&F.out!=="altro"){const x=esitoDa(F.out,F.risk,num(F.rr)?F.rr:null);if(x){F.res=x.res;F.r=x.r}else{F.res=null;F.r=null}}if(f==="risk"&&!F.pos&&F.out==="altro")F.r=rDaEsito(F.res,F.risk);if(f==="ora"){const o=parseOra(v);if(o){const [h,m]=o.split(":").map(Number);F.ses=sessFor(h+m/60)}}if(f==="less"||f==="why")return;const sel=document.activeElement,id=sel&&sel.dataset.ff;renderSheet();if(id){const el=document.querySelector(`[data-ff="${id}"]`);if(el){el.focus();if(el.type==="text"||el.type==="number")try{el.setSelectionRange(el.value.length,el.value.length)}catch(x){}}}});
function nuovaCoppia(g){const c=normCoppia(g.value);if(c.length<3){if(g.value.trim())toast("Coppia non valida: scrivila tipo EURUSD.");return}setC(c);redraw(true)}
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="newPair"){e.preventDefault();nuovaCoppia(e.target);return}if(e.key==="Escape"){closeSheet();$("pop").hidden=true}if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&e.target.id==="cTxt"){e.preventDefault();inviaC()}});
document.addEventListener("paste",e=>{if(!F&&inSess()){const it=[...(e.clipboardData?.items||[])].filter(i=>i.kind==="file"&&/^image\//.test(i.type));if(it.length){e.preventDefault();it.forEach(i=>addC(i.getAsFile()))}return}
  if(!F||F.mode==="close")return;const items=[...(e.clipboardData?.items||[])].filter(i=>i.kind==="file"&&/^image\//.test(i.type));if(items.length){e.preventDefault();items.forEach(i=>addPending(i.getAsFile()));toast("Screenshot aggiunto.")}});
document.addEventListener("dragover",e=>{if(F||inSess()){e.preventDefault()}});
document.addEventListener("drop",e=>{if(!F&&inSess()){e.preventDefault();[...(e.dataTransfer?.files||[])].forEach(addC);return}if(!F)return;e.preventDefault();[...(e.dataTransfer?.files||[])].forEach(addPending)});
window.addEventListener("hashchange",route);

/* ===== LOGIN ===== */
function showLogin(msg){USER=null;T=[];$("app").hidden=true;$("login").hidden=false;$("loginErr").textContent=msg||"";$("sheet").hidden=true;$("pop").hidden=true}
async function enter(session){USER=session.user;$("login").hidden=true;$("app").hidden=false;$("view").innerHTML=`<div class="empty">Leggo l'archivio…</div>`;if(await loadAll())route();else $("view").innerHTML=`<div class="empty"><b>Archivio non raggiungibile.</b>${esc(syncMsg)}. Ricarica tra un minuto.</div>`}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const b=$("loginBtn");b.classList.add("busy");$("loginErr").textContent="";const {error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});b.classList.remove("busy");if(error)$("loginErr").textContent=/invalid/i.test(error.message)?"Mail o password sbagliate.":error.message});
if(!sb){showLogin("Manca config.js: l'app non sa a quale archivio collegarsi.")}
else{
  sb.auth.getSession().then(({data})=>{data.session?enter(data.session):showLogin()});
  sb.auth.onAuthStateChange((ev,session)=>{if(ev==="SIGNED_IN"&&session&&!USER)enter(session);if(ev==="SIGNED_OUT")showLogin()});
}
})();
