// Journal di Lore: interfaccia + archivio su Supabase. La logica pura sta in logica.js (JL).
(function(){
const {pad,dk,esc,pct,fmtD,STRAT,STATI,SK,SESSOPT,sessFor,mm,sessState,rowToT,tToRow,sortT,tvImg,allConf,closedOf,stats,confTable,checkTable,statoTable,curve,serieP,weekOf}=window.JL;
const GG=["dom","lun","mar","mer","gio","ven","sab"], MESI=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const today=new Date(); const TK=dk(today);
const $=id=>document.getElementById(id);

/* ===== ARCHIVIO (Supabase) ===== */
const CFG=window.JOURNAL_CONFIG||{};
const sb=(window.supabase&&CFG.url&&CFG.anonKey)?window.supabase.createClient(CFG.url,CFG.anonKey):null;
const TAB="journal_trade", BUCKET="screenshot";
let T=[], USER=null, CONF=[], syncMsg="non collegato";
const urlCache={};
async function urlFor(path){if(urlCache[path])return urlCache[path];const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(path,3600);if(error||!data)return"";urlCache[path]=data.signedUrl;return data.signedUrl}
async function loadAll(){const {data,error}=await sb.from(TAB).select("*").order("data").order("ora");if(error){syncMsg="errore di lettura: "+error.message;toast("Non riesco a leggere l'archivio.");return false}T=sortT(data.map(rowToT));CONF=allConf(T);syncMsg="collegato · "+T.length+" trade";return true}
async function saveT(t){const row=tToRow(t);const q=row.id?sb.from(TAB).update(row).eq("id",row.id):sb.from(TAB).insert(row);const {data,error}=await q.select().single();if(error){toast("Non salvato: "+error.message);return null}const n=rowToT(data);const i=T.findIndex(x=>x.id===n.id);i>=0?T[i]=n:T.push(n);sortT(T);CONF=allConf(T);syncMsg="collegato · "+T.length+" trade";return n}
async function delT(t){const {error}=await sb.from(TAB).delete().eq("id",t.id);if(error){toast("Non cancellato: "+error.message);return false}if(t.imgs.length)await sb.storage.from(BUCKET).remove(t.imgs);T=T.filter(x=>x.id!==t.id);CONF=allConf(T);return true}
async function uploadImg(tradeId,blob,i){const ext=(blob.type==="image/jpeg")?"jpg":blob.type==="image/webp"?"webp":"png";const path=USER.id+"/"+tradeId+"/"+Date.now()+"-"+i+"."+ext;const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:blob.type||"image/png"});if(error){toast("Screenshot non caricato: "+error.message);return null}return path}
function hydrateImgs(){document.querySelectorAll("img[data-path]").forEach(async img=>{const p=img.dataset.path;delete img.dataset.path;const u=await urlFor(p);if(u)img.src=u;else img.closest(".thumb,.im,.gal a")?.classList.add("none")})}

/* ===== GRAFICI ===== */
function area(vals,h,grid){if(vals.length<2)return`<div class="empty" style="height:${h}px;display:grid;place-items:center">la curva parte dal secondo trade chiuso</div>`;const w=600,min=Math.min(0,...vals),max=Math.max(0,...vals),sp=max-min||1;const x=i=>i/(vals.length-1)*w,y=v=>h-6-(v-min)/sp*(h-14);const pts=vals.map((v,i)=>[x(i),y(v)]);let p="M"+pts[0][0]+" "+pts[0][1];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],cx=(a[0]+b[0])/2;p+=` C${cx} ${a[1]},${cx} ${b[1]},${b[0]} ${b[1]}`}const id="g"+Math.random().toString(36).slice(2,7);const z=y(0);const gl=grid?[0,.5,1].map(k=>`<line x1="0" x2="${w}" y1="${(6+k*(h-14)).toFixed(1)}" y2="${(6+k*(h-14)).toFixed(1)}" stroke="rgba(255,255,255,.07)"/>`).join(""):"";return`<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" style="height:${h}px"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".4"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>${gl}<line x1="0" x2="${w}" y1="${z}" y2="${z}" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 5"/><path d="${p} L${w} ${h} L0 ${h}Z" fill="url(#${id})"/><path d="${p}" fill="none" stroke="var(--acc)" stroke-width="2.5"/></svg>`}
function donut(wr){const r=58,C=2*Math.PI*r;return`<svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(240,97,110,.35)" stroke-width="12"/><circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--win)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C*wr/100} ${C}" transform="rotate(-90 70 70)"/></svg>`}
const hbar=x=>`<div class="hb ${x.with.n<8?"dimmed":x.lift>10?"good":x.lift<-10?"bad":""}"><span>${esc(x.k)}<small>${x.with.n}</small></span><div class="track"><i style="width:${x.with.wr}%"></i><em style="left:${x.without.wr}%" title="senza"></em></div><b>${x.lift>0?"+":""}${x.lift.toFixed(0)}</b></div>`;
const fR=v=>(v>0?"+":"")+(+v).toFixed(1).replace(".",",");
const nImg=t=>(t.imgs?t.imgs.length:0)+(t.tv?1:0);
const firstImg=(t,cls)=>t.imgs&&t.imgs.length?`<div class="${cls}"><img alt="" data-path="${esc(t.imgs[0])}"></div>`:t.tv?`<div class="${cls}"><img alt="" src="${esc(tvImg(t.tv))}" onerror="this.parentNode.classList.add('none');this.remove()"><span class="tag">TradingView</span></div>`:`<div class="${cls} none"><span>nessuna immagine</span></div>`;

/* ===== VISTE ===== */
function header(){$("hdDate").textContent=GG[today.getDay()]+" "+pad(today.getDate())+"."+pad(today.getMonth()+1)+" · "+(today.getHours()<12?"mattina":today.getHours()<18?"pomeriggio":"sera")}
let preStato=null;
function vHome(){
  const L=closedOf(T,"xau"),s=stats(L.slice(-20)),all=stats(L);
  const ct=confTable(T,"xau"),top=ct.filter(x=>x.with.n>=4).slice(0,3),bad=ct.filter(x=>x.with.n>=3&&x.lift<0).slice(-1)[0];
  const open=T.filter(t=>t.open).slice(-1)[0],last=closedOf(T).filter(t=>t.less).slice(-1)[0];
  const stw=preStato?statoTable(T,"xau").find(x=>x.k===preStato):null;
  const wk=weekOf(T,today),sw=stats(wk);
  return `<div class="grid g-home enter">
  <div class="col">
   <section class="blk"><div class="lab"><span>La strategia oro · ultimi 20 trade</span><a href="#statistiche">Statistiche →</a></div>
    ${all.n?`<div class="kpis"><div class="kpi ${s.wr>=50?"good":""}"><b>${s.wr.toFixed(0)} %</b><span>win rate</span></div><div class="kpi"><b>${fR(s.avgR)} R</b><span>R medio</span></div><div class="kpi"><b>${pct(s.sum)}</b><span>sul conto</span></div><div class="kpi"><b>${all.n}</b><span>trade</span></div></div>
    <div style="margin-top:12px">${area(curve(L),130,true)}</div><div class="note">Curva in % sul conto, mai in soldi.</div>`
    :`<div class="empty"><b>Ancora nessun trade chiuso sull'oro.</b>Dal calendario tocchi un giorno e registri il primo. Qui compariranno win rate, R medio e la curva.</div>`}</section>
   <section class="blk"><div class="lab"><span>Le conferme che stanno pagando</span><span>win rate con · senza</span></div>
    ${top.length?`<div class="conf">${top.map(x=>`<div><span style="text-align:left;color:var(--ink);font-size:13px">${esc(x.k)}</span><span>${x.with.n} trade</span><b>${x.with.wr.toFixed(0)} % · ${x.without.wr.toFixed(0)} %</b><div class="bar"><i style="width:${x.with.wr}%"></i></div></div>`).join("")}
    ${bad?`<div class="bad"><span style="text-align:left;color:var(--ink);font-size:13px">${esc(bad.k)}</span><span>${bad.with.n} trade</span><b>${bad.with.wr.toFixed(0)} % · ${bad.without.wr.toFixed(0)} %</b><div class="bar"><i style="width:${bad.with.wr}%"></i></div></div>`:""}</div>`
    :`<div class="empty">Servono almeno 4 trade con la stessa confluenza perché compaia qui.</div>`}</section>
  </div>
  <div class="col">
   <section class="blk"><div class="lab"><span>Adesso</span><span id="clkDate"></span></div><div class="clock"><b id="clk">--:--:--</b><small id="clkSess"></small></div><div class="sess" id="sess"></div></section>
   <section class="blk hi"><div class="lab"><span>Come arrivo alla sessione</span><span>8:00-10:30 · 16:30-19:00</span></div>
    <div class="today" style="margin-bottom:12px">serie piano rispettato: <b>${serieP(T)} trade di fila</b></div>
    <div class="states">${STATI.map(([k,d])=>`<button type="button" data-pre="${esc(k)}" class="${preStato===k?"on":""}">${esc(k)}<small>${esc(d)}</small></button>`).join("")}</div>
    <div class="msg ${stw&&preStato!=="lucido"?"warn":""}">${!preStato?"Un tocco prima di aprire il grafico: lo ritrovi già segnato nel nuovo trade.":preStato==="lucido"?"<b>Bene.</b> Checklist, poi il grafico.":stw?"Quando parti così il win rate scende a <b>"+stw.wr.toFixed(0)+" %</b> ("+stw.n+" trade). Oggi solo checklist completa, oppure niente.":"Oggi solo checklist completa, oppure niente."}</div></section>
   <section class="blk"><div class="lab"><span>La checklist oro</span><span>win rate quando c'è</span></div>
    <ol class="steps">${checkTable(T,"xau").map((c,i)=>`<li><i>${i+1}</i><span>${esc(c.k)}<br><small>${esc(c.tf)}</small></span><span class="wr">${c.with.n?c.with.wr.toFixed(0)+" %":"—"}</span></li>`).join("")}</ol></section>
  </div>
  <div class="col">
   ${open?`<section class="blk" style="border-color:rgba(242,184,75,.45)"><div class="lab"><span>Trade aperto</span><span>${open.d===TK?"oggi":fmtD(open.d)}</span></div><div class="big">${STRAT[open.s].sym} <small>${open.dir} · rischio ${open.risk==null?"—":String(open.risk).replace(".",",")+" %"}</small></div><div class="note">checklist ${open.check.filter(Boolean).length}/5${open.conf.length?" · "+esc(open.conf.join(", ")):""}</div><button type="button" class="cta" style="margin-top:12px" data-close="${open.id}">Chiudi il trade</button></section>`:""}
   <section class="blk"><div class="lab"><span>L'ultima lezione</span><span>${last?fmtD(last.d):""}</span></div><p class="quote">${esc(last?last.less:"La scrivi quando chiudi un trade: una riga.")}<small>${last?STRAT[last.s].sym+" · "+pct(last.res):""}</small></p></section>
   <section class="blk"><div class="lab"><span>Questa settimana</span><a href="#calendario">Calendario →</a></div>
    <div class="kpis"><div class="kpi"><b>${sw.n}</b><span>trade</span></div><div class="kpi"><b>${sw.n?sw.wr.toFixed(0)+" %":"—"}</b><span>win rate</span></div><div class="kpi"><b>${wk.filter(t=>t.piano!==false).length}/${sw.n}</b><span>piano ok</span></div></div></section>
  </div></div>`;
}

let calM=new Date(today.getFullYear(),today.getMonth(),1),calSel=TK;
function vCal(){
  const y=calM.getFullYear(),m=calM.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
  const byDay={};T.forEach(t=>{(byDay[t.d]=byDay[t.d]||[]).push(t)});
  let cells="";for(let i=0;i<start;i++)cells+=`<div class="d off"></div>`;
  for(let d=1;d<=days;d++){const k=y+"-"+pad(m+1)+"-"+pad(d),L=byDay[k]||[],cl=L.filter(t=>!t.open&&t.res!=null),sum=cl.reduce((a,t)=>a+t.res,0);
    cells+=`<button type="button" class="d ${k===TK?"today":""} ${k===calSel?"sel":""}" data-cal="${k}" title="Nuovo trade il ${fmtD(k)}"><span>${d}</span><div class="dots">${L.map(t=>`<i class="${t.open?"":t.res>0?"w":"l"}"></i>`).join("")}</div>${cl.length?`<span class="r ${sum>0?"w":"l"}">${pct(sum)}</span>`:"<span></span>"}</button>`}
  const L=byDay[calSel]||[];const ms=stats(closedOf(T).filter(t=>t.d.startsWith(y+"-"+pad(m+1))));
  return `<div class="grid g-cal enter"><section class="blk"><div class="mnav"><button type="button" data-mv="-1">← ${MESI[(m+11)%12]}</button><b>${MESI[m]} ${y}</b><button type="button" data-mv="1">${MESI[(m+1)%12]} →</button></div>
   <div class="cal">${["lun","mar","mer","gio","ven","sab","dom"].map(h=>`<div class="h">${h}</div>`).join("")}${cells}</div>
   <div class="note">Tocca un giorno: si apre subito il nuovo trade con quella data. Mese: ${ms.n} trade chiusi · win rate ${ms.n?ms.wr.toFixed(0)+" %":"—"} · ${pct(ms.sum)}.</div></section>
  <div class="col"><section class="blk"><div class="lab"><span>${calSel===TK?"Oggi":fmtD(calSel)}</span><button type="button" class="cta ghost sm" data-newday="${calSel}">+ trade</button></div>
   <div class="trades">${L.length?L.map(t=>`<button type="button" class="tr" data-open="${t.id}"><span class="sym">${STRAT[t.s].sym}<small>${t.ora?esc(t.ora)+" · ":""}${t.dir}${t.ses?" · "+esc(t.ses):""}</small></span><span class="tags">checklist ${t.check.filter(Boolean).length}/5 · ${esc(t.conf.join(", "))||"nessuna confluenza"}</span><span class="res ${t.open?"o":t.res>0?"w":"l"}">${t.open?"aperto":pct(t.res)}<span class="st">${t.open?"":t.piano===false?"fuori piano":"piano ok"} · ${nImg(t)} img</span></span></button>`).join(""):`<div class="note" style="margin:0">Nessun trade in questo giorno.</div>`}</div></section></div></div>`;
}

/* ===== ORA E SESSIONI (ora italiana) ===== */
function tickClock(){const el=$("clk");if(!el)return;const d=new Date();el.textContent=pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
  const h=d.getHours()+d.getMinutes()/60;const st=sessState(h);const open=st.filter(x=>x.on&&!x.n.startsWith("La mia")).map(x=>x.n);const mine=st.some(x=>x.on&&x.n.startsWith("La mia"));
  $("clkDate").textContent=GG[d.getDay()]+" "+pad(d.getDate())+"."+pad(d.getMonth()+1)+" · ora italiana";
  $("clkSess").textContent=(open.length?"aperte: "+open.join(" + "):"mercato quasi fermo")+(mine?" · il tuo momento":"");
  const k=st.map(x=>x.n+x.on).join();const box=$("sess");
  if(box.dataset.k!==k){box.dataset.k=k;box.innerHTML=st.map(x=>{const l=(x.a/24*100).toFixed(1),w=((x.a<x.b?x.b-x.a:24-x.a+x.b)/24*100).toFixed(1);const wrap=x.a>x.b;return`<div class="${x.n.startsWith("La mia")?"mine":""} ${x.on?"on":""}"><b>${x.n==="La mia"?"la mia · mattina":x.n==="La mia 2"?"la mia · pomeriggio":x.n}</b><span class="tr"><i style="left:${l}%;width:${wrap?(100-l):w}%"></i>${wrap?`<i style="left:0;width:${(x.b/24*100).toFixed(1)}%"></i>`:""}<span class="now" style="left:${(h/24*100).toFixed(1)}%"></span></span><em>${x.on?"aperta":mm(x.a)+"-"+mm(x.b)}</em></div>`}).join("")}
  else{box.querySelectorAll(".now").forEach(n=>n.style.left=(h/24*100).toFixed(1)+"%")}}
setInterval(tickClock,1000);

/* ===== LISTA TRADE ===== */
let tView="grid",tFilt="all";
try{tView=localStorage.getItem("journal-vista")||"grid"}catch(e){}
function vTrades(){
  const L=T.slice().reverse().filter(t=>tFilt==="all"||t.s===tFilt);
  const body=!L.length?`<div class="empty"><b>Nessun trade.</b>Il primo lo registri da "+ Nuovo trade" o dal calendario.</div>`
   :tView==="list"?`<div class="tlist">${L.map(t=>`<button type="button" class="tr" data-open="${t.id}">${firstImg(t,"thumb")}<span class="sym">${STRAT[t.s].sym}<small>${fmtD(t.d)}${t.ora?" "+esc(t.ora):""} · ${t.dir}</small></span><span class="tags">checklist ${t.check.filter(Boolean).length}/5 · ${esc(t.conf.join(", "))||"nessuna confluenza"}${t.prima?" · prima: "+esc(t.prima):""}</span><span class="res ${t.open?"o":t.res>0?"w":"l"}">${t.open?"aperto":pct(t.res)}<span class="st">${t.open?"":t.piano===false?"fuori piano":"piano ok"}</span></span></button>`).join("")}</div>`
   :`<div class="tgrid">${L.map(t=>`<button type="button" class="tcard" data-open="${t.id}">${firstImg(t,"im").replace("</div>",`<span class="res ${t.open?"o":t.res>0?"w":"l"}">${t.open?"aperto":pct(t.res)}</span></div>`)}<div class="bd"><b>${STRAT[t.s].sym} · ${t.dir}</b><small>${fmtD(t.d)}${t.ora?" "+esc(t.ora):""}${t.ses?" · "+esc(t.ses):""} · checklist ${t.check.filter(Boolean).length}/5</small><small>${esc(t.conf.join(", "))||"nessuna confluenza"}</small></div></button>`).join("")}</div>`;
  return`<div class="col enter"><div class="tools"><div class="seg"><button type="button" data-tf="all" class="${tFilt==="all"?"on":""}">Tutti</button><button type="button" data-tf="xau" class="${tFilt==="xau"?"on":""}">XAUUSD</button><button type="button" data-tf="fx" class="${tFilt==="fx"?"on":""}">FOREX</button></div><span class="note" style="margin:0">${L.length} trade</span><div class="seg"><button type="button" data-tv="grid" class="${tView==="grid"?"on":""}">▦ Quadrotti</button><button type="button" data-tv="list" class="${tView==="list"?"on":""}">☰ Lista</button></div></div>${body}</div>`;
}

let stS="xau";
function vStats(){
  const L=closedOf(T,stS),s=stats(L);const cv=curve(L);const st=statoTable(T,stS);const ct=confTable(T,stS);
  return `<div class="col enter">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="seg" style="width:260px"><button type="button" data-st="xau" class="${stS==="xau"?"on":""}">XAUUSD</button><button type="button" data-st="fx" class="${stS==="fx"?"on":""}">FOREX</button></div><span class="note" style="margin:0">${s.n} trade chiusi · ${STRAT[stS].sub}</span></div>
   <div class="grid g-stats">
    <section class="blk"><div class="lab"><span>Andamento · % sul conto</span><span>${pct(s.sum)} in totale</span></div>${area(cv,220,true)}<div class="axis"><span>${L[0]?fmtD(L[0].d):""}</span><span>${L.length?fmtD(L[L.length-1].d):""}</span></div></section>
    <section class="blk"><div class="lab"><span>Vinti e persi</span></div>
     <div class="donut"><div class="c">${donut(s.wr)}<div><b>${s.n?s.wr.toFixed(0)+" %":"—"}</b><small>win rate</small></div></div><div class="legend"><div><span><i style="background:var(--win)"></i>vinti</span><b>${s.w}</b></div><div><span><i style="background:var(--loss)"></i>persi</span><b>${s.l}</b></div><div><span><i style="background:var(--acc)"></i>R medio</span><b>${s.n?fR(s.avgR):"—"}</b></div><div><span><i style="background:var(--amber)"></i>profit factor</span><b>${!s.n?"—":s.pf===Infinity?"∞":s.pf.toFixed(2).replace(".",",")}</b></div></div></div></section>
   </div>
   <div class="grid g-stats">
    <section class="blk"><div class="lab"><span>Le confluenze: cosa alza la statistica</span><span>barra = win rate con · tacca = senza</span></div>
     ${ct.length?`<div class="hbars">${ct.map(hbar).join("")}</div><div class="note">Il numero a destra è la differenza di win rate. Verde: aiuta davvero. Rosso: toglie. In grigio le etichette con meno di 8 trade.</div>`:`<div class="empty">Compare quando ci sono trade chiusi con delle confluenze segnate.</div>`}</section>
    <div class="col">
     <section class="blk"><div class="lab"><span>Come ero prima della sessione</span><span>win rate</span></div>
      ${st.length?`<div class="vbars">${st.map(x=>`<div class="vb ${x.wr>=55?"good":x.wr<45?"bad":""}"><b>${x.wr.toFixed(0)} %</b><i style="height:${Math.max(6,x.wr)}%"></i><span>${esc(x.k)}<br>${x.n} trade</span></div>`).join("")}</div>`:`<div class="empty">Segna come stai prima di ogni trade: qui vedrai quanto pesa.</div>`}</section>
     <section class="blk"><div class="lab"><span>La checklist, voce per voce</span><span>win rate con · senza</span></div>
      <div class="hbars">${checkTable(T,stS).map(hbar).join("")}</div></section>
    </div>
   </div></div>`;
}

/* ===== NUOVO TRADE / CHIUSURA / MODIFICA: a tutto schermo ===== */
let F=null, saving=false;
function openNew(dateKey,id,mode){
  const t=id?T.find(x=>x.id===id):null;
  const nowH=today.getHours()+today.getMinutes()/60;
  F=t?JSON.parse(JSON.stringify(t)):{s:"xau",dir:"long",d:dateKey||TK,ora:pad(today.getHours())+":"+pad(today.getMinutes()),ses:sessFor(nowH),risk:STRAT.xau.risk,check:[0,0,0,0,0],conf:[],prima:preStato,dopo:null,piano:null,res:null,r:null,less:"",tv:"",imgs:[],open:true,id:"n"+Date.now()};
  F.mode=t?(mode||(t.open?"close":"edit")):"new";F.pending=[];F.drop=[];F.confirmDel=false;
  renderSheet();$("sheet").scrollTop=0;
}
const stateBtns=(attr,cur)=>`<div class="states">${STATI.map(([k,d])=>`<button type="button" data-${attr}="${esc(k)}" class="${cur===k?"on":""}">${esc(k)}<small>${esc(d)}</small></button>`).join("")}</div>`;
function renderSheet(){
  const st=STRAT[F.s],done=F.check.filter(Boolean).length,n=st.check.length,M=F.mode;
  const imgs=F.imgs.filter(p=>!F.drop.includes(p));
  const thumbs=[...imgs.map(p=>`<div><img alt="" data-path="${esc(p)}"><button type="button" data-rmimg="${esc(p)}" aria-label="Togli">×</button></div>`),...F.pending.map((b,i)=>`<div><img alt="" src="${b.url}"><button type="button" data-rmpend="${i}" aria-label="Togli">×</button></div>`)];
  const summary=`<div class="card"><h4>Il trade in sintesi</h4><div class="sum">
    <div><span>strumento</span><b>${st.sym} · ${F.dir}</b></div><div><span>quando</span><b>${fmtD(F.d)}${F.ora?" · "+esc(F.ora):""}</b></div><div><span>sessione</span><b>${esc(F.ses||"—")}</b></div><div><span>rischio</span><b>${F.risk==null?"—":String(F.risk).replace(".",",")+" %"}</b></div>
    <div><span>checklist</span><b class="${done===n?"ok":"no"}">${done}/${n}${done===n?" · completa":""}</b></div>
    <div><span>confluenze</span><b>${F.conf.length||"—"}</b></div><div><span>immagini</span><b>${(imgs.length+F.pending.length+(F.tv?1:0))||"—"}</b></div>
    <div><span>prima</span><b>${esc(F.prima||"—")}</b></div>${M!=="new"?`<div><span>esito</span><b class="${F.res>0?"ok":F.res<0?"no":""}">${F.res==null?"—":pct(F.res)}</b></div>`:""}
   </div>${done<n&&M==="new"?`<div class="msg warn" style="margin-top:14px"><b>Checklist non completa.</b> Puoi salvare lo stesso, ma nelle statistiche conterà come trade fuori checklist.</div>`:""}</div>`;
  const setup=`<section class="card"><h4><i>1</i>Cosa</h4>
     <div class="row2" style="margin-bottom:12px"><label class="fl">strategia<div class="big2"><button type="button" data-fs="xau" class="${F.s==="xau"?"on":""}">XAUUSD</button><button type="button" data-fs="fx" class="${F.s==="fx"?"on":""}">FOREX</button></div></label><label class="fl">direzione<div class="big2"><button type="button" data-fd="long" class="long ${F.dir==="long"?"on":""}">▲ long</button><button type="button" data-fd="short" class="short ${F.dir==="short"?"on":""}">▼ short</button></div></label></div>
     <div class="row3"><label class="fl">data<input type="date" value="${F.d}" data-ff="d"></label><label class="fl">orario di entrata<input type="time" value="${esc(F.ora||"")}" data-ff="ora"></label><label class="fl">rischio sul conto, %<input type="number" step="0.1" value="${F.risk==null?"":F.risk}" data-ff="risk"></label></div>
     <label class="fl" style="margin-top:12px">sessione<div class="chips">${SESSOPT.map(x=>`<button type="button" data-fse="${esc(x)}" class="${F.ses===x?"on":""}">${esc(x)}</button>`).join("")}</div></label></section>
   <section class="card"><h4><i>2</i>La checklist ${st.n}<span>${done}/${n}</span></h4><div class="check">${st.check.map((c,i)=>`<button type="button" data-fc="${i}" class="${F.check[i]?"on":""}"><i>${F.check[i]?"✓":""}</i><span>${esc(c[0])}${c[1]?`<small>${esc(c[1])}</small>`:""}</span><em>${esc(c[2])}</em></button>`).join("")}</div><div class="prog"><i style="width:${done/n*100}%"></i></div></section>
   <section class="card"><h4><i>3</i>Confluenze oltre la checklist<span>quello che vede il tuo occhio</span></h4><div class="chips">${[...new Set([...CONF,...F.conf])].map(c=>`<button type="button" data-fk="${esc(c)}" class="${F.conf.includes(c)?"on":""}">${esc(c)}</button>`).join("")}</div>
    <div class="addtag"><input type="text" id="newConf" placeholder="una nuova confluenza, con parole tue"><button type="button" class="cta ghost" id="addConf">Aggiungi</button></div></section>
   <section class="card"><h4><i>4</i>Screenshot<span>incolla, trascina o scegli</span></h4><div class="drop" id="drop">${thumbs.length?`<div class="thumbs">${thumbs.join("")}</div>`:""}<span><kbd>⌘V</kbd> per incollare dagli appunti, trascina qui, oppure <u>scegli un file</u>.</span><input type="file" id="fileIn" accept="image/*" multiple></div>
    <label class="fl" style="margin-top:12px">link TradingView (condividi → copia link)<input type="text" value="${esc(F.tv||"")}" data-ff="tv" placeholder="https://www.tradingview.com/x/…"></label>${F.tv?`<div class="gal" style="margin-top:10px"><a href="${esc(F.tv)}" target="_blank" rel="noopener"><img alt="" src="${esc(tvImg(F.tv))}" onerror="this.outerHTML='<span class=ph>anteprima non disponibile: il link si apre in TradingView</span>'"></a></div>`:""}</section>
   <section class="card"><h4><i>5</i>Come ero prima</h4>${stateBtns("fp",F.prima)}</section>`;
  const closing=`<section class="card"><h4><i>${M==="edit"?6:1}</i>Esito</h4><div class="row3"><label class="fl">sul conto, %<input type="number" step="0.01" value="${F.res==null?"":F.res}" data-ff="res" placeholder="+0,80 o -0,50"></label><label class="fl">R<input type="number" step="0.1" value="${F.r==null?"":F.r}" data-ff="r" placeholder="+2,1 o -1"></label><label class="fl">piano rispettato<div class="big2"><button type="button" data-fpl="1" class="${F.piano===true?"on":""}">sì</button><button type="button" data-fpl="0" class="${F.piano===false?"on":""}">no</button></div></label></div></section>
   <section class="card"><h4><i>${M==="edit"?7:2}</i>Come ero</h4><div class="row2"><div><div class="note" style="margin:0 0 8px">prima</div>${stateBtns("fp",F.prima)}</div><div><div class="note" style="margin:0 0 8px">durante e dopo</div>${stateBtns("fo",F.dopo)}</div></div></section>
   <section class="card"><h4><i>${M==="edit"?8:3}</i>La lezione<span>una riga, anche dettata</span></h4><textarea data-ff="less" placeholder="cosa dipendeva da me? cosa rifaccio uguale?">${esc(F.less)}</textarea></section>`;
  const gallery=M==="close"&&(imgs.length||F.tv)?`<section class="card"><h4>Le immagini</h4><div class="gal">${imgs.map(p=>`<a href="#" data-big="${esc(p)}"><img alt="" data-path="${esc(p)}"></a>`).join("")}${F.tv?`<a href="${esc(F.tv)}" target="_blank" rel="noopener"><img alt="" src="${esc(tvImg(F.tv))}" onerror="this.outerHTML='<span class=ph>apri in TradingView</span>'"></a>`:""}</div></section>`:"";
  const title=M==="new"?"Nuovo trade":M==="close"?"Chiudi il trade":"Il trade";
  const sub=M==="new"?"Un minuto: tutto a tocchi. Lo screenshot lo incolli con ⌘V in qualsiasi punto.":M==="close"?"Trenta secondi: esito, come sei stato, una riga di lezione.":"Tutto modificabile. Le immagini si aprono con un clic.";
  $("sheetIn").innerHTML=`<div class="top"><div><h2>${title}</h2><div class="sub">${sub}</div></div><button type="button" class="x" id="cancelSheet" aria-label="Chiudi">×</button></div>
  <main>${M==="close"?gallery+closing:M==="edit"?setup+(F.open?"":closing):setup}</main>
  <aside>${summary}<div class="acts"><button type="button" class="cta" id="saveSheet">${M==="new"?"Salva · trade aperto":M==="close"?"Salva e chiudi il trade":"Salva le modifiche"}</button>${M==="close"?`<button type="button" class="cta ghost" data-editopen="${F.id}">Modifica i dati di entrata</button>`:""}${M==="edit"&&!F.open?`<button type="button" class="cta ghost" id="reopen">Riapri il trade</button>`:""}<button type="button" class="cta ghost" id="cancelSheet2">Annulla</button>${M!=="new"?(F.confirmDel?`<button type="button" class="cta ghost danger" id="delYes">Sì, elimina per sempre</button>`:`<button type="button" class="cta ghost" id="delAsk" style="color:var(--dim)">Elimina il trade</button>`):`<div class="note" style="text-align:center;margin:0">l'esito lo metti quando chiude</div>`}</div></aside>`;
  $("sheet").hidden=false;hydrateImgs();
}
function closeSheet(){F&&F.pending.forEach(b=>URL.revokeObjectURL(b.url));$("sheet").hidden=true;F=null;if(location.hash==="#nuovo")history.replaceState(null,"","#home")}
function addPending(file){if(!F||!/^image\//.test(file.type))return;F.pending.push({blob:file,url:URL.createObjectURL(file)});renderSheet()}
async function commitSheet(){
  if(saving)return;const M=F.mode;
  if(M==="close"&&(F.res==null||isNaN(F.res))){toast("Manca l'esito in %.");return}
  saving=true;$("saveSheet").classList.add("busy");
  const t={...F};delete t.mode;delete t.pending;delete t.drop;delete t.confirmDel;
  if(M==="close"){t.open=false;if(t.r==null)t.r=t.res>0?2:-1;if(t.piano==null)t.piano=true}
  if(M==="edit"&&F.reopen){t.open=true}
  if(F.drop.length){await sb.storage.from(BUCKET).remove(F.drop);t.imgs=t.imgs.filter(p=>!F.drop.includes(p))}
  let saved=await saveT(t);
  if(saved&&F.pending.length){const paths=[];for(let i=0;i<F.pending.length;i++){const p=await uploadImg(saved.id,F.pending[i].blob,i);if(p)paths.push(p)}if(paths.length){saved=await saveT({...saved,imgs:[...saved.imgs,...paths]})}}
  saving=false;
  if(!saved){$("saveSheet").classList.remove("busy");return}
  calSel=saved.d;toast(M==="new"?"Trade salvato, aperto. Lo chiudi quando chiude.":M==="close"?"Trade chiuso: "+pct(saved.res)+".":"Modifiche salvate.");
  closeSheet();route();
}

const VIEWS={home:vHome,calendario:vCal,trade:vTrades,statistiche:vStats};
function route(){if(!USER)return;header();const v=(location.hash||"#home").slice(1);if(v==="nuovo"&&!F)openNew(TK);const fn=VIEWS[v]||vHome;$("view").innerHTML=fn();document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("on",a.dataset.v===(VIEWS[v]?v:"home")));window.scrollTo(0,0);tickClock();hydrateImgs()}
let tt;function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,3000)}
function setPal(p){p==="verde"?document.documentElement.removeAttribute("data-pal"):document.documentElement.setAttribute("data-pal","mono");try{localStorage.setItem("journal-pal",p)}catch(e){}document.querySelectorAll("#pop [data-pal]").forEach(b=>b.classList.toggle("on",b.dataset.pal===p))}

document.addEventListener("click",async e=>{
  const q=s=>e.target.closest(s);
  if(q("#gearBtn")){const p=$("pop");p.hidden=!p.hidden;$("syncSt").textContent=syncMsg;$("who").textContent=USER?USER.email:"";setPal(document.documentElement.getAttribute("data-pal")==="mono"?"mono":"verde");return}
  if(!q("#pop")&&!$("pop").hidden)$("pop").hidden=true;
  const pl=q("#pop [data-pal]");if(pl){setPal(pl.dataset.pal);return}
  if(q("#logoutBtn")){await sb.auth.signOut();return}
  if(q("#newBtn")){openNew(TK);return}
  const nd=q("[data-newday]");if(nd){openNew(nd.dataset.newday);return}
  const cl=q("[data-close]");if(cl){openNew(null,cl.dataset.close,"close");return}
  const tr=q("[data-open]");if(tr){openNew(null,tr.dataset.open);return}
  const pre=q("[data-pre]");if(pre){preStato=preStato===pre.dataset.pre?null:pre.dataset.pre;route();return}
  const cal=q("[data-cal]");if(cal){calSel=cal.dataset.cal;route();openNew(calSel);return}
  const mv=q("[data-mv]");if(mv){calM.setMonth(calM.getMonth()+ +mv.dataset.mv);route();return}
  const st=q("[data-st]");if(st){stS=st.dataset.st;route();return}
  const tv=q("[data-tv]");if(tv){tView=tv.dataset.tv;try{localStorage.setItem("journal-vista",tView)}catch(x){}route();return}
  const tf=q("[data-tf]");if(tf){tFilt=tf.dataset.tf;route();return}
  if(!F)return;
  const eo=q("[data-editopen]");if(eo){openNew(null,eo.dataset.editopen,"edit");return}
  const big=q("[data-big]");if(big){e.preventDefault();const u=await urlFor(big.dataset.big);if(u)window.open(u,"_blank");return}
  const fs=q("[data-fs]");if(fs){F.s=fs.dataset.fs;F.risk=STRAT[F.s].risk;F.check=STRAT[F.s].check.map(()=>0);renderSheet();return}
  const fd=q("[data-fd]");if(fd){F.dir=fd.dataset.fd;renderSheet();return}
  const fse=q("[data-fse]");if(fse){F.ses=fse.dataset.fse;renderSheet();return}
  const fc=q("[data-fc]");if(fc){F.check[+fc.dataset.fc]^=1;renderSheet();return}
  const fk=q("[data-fk]");if(fk){const k=fk.dataset.fk,i=F.conf.indexOf(k);i>=0?F.conf.splice(i,1):F.conf.push(k);renderSheet();return}
  if(q("#addConf")){const v=$("newConf").value.trim();if(v){if(!CONF.includes(v))CONF.push(v);if(!F.conf.includes(v))F.conf.push(v);renderSheet()}return}
  const fp=q("[data-fp]");if(fp){F.prima=fp.dataset.fp;renderSheet();return}
  const fo=q("[data-fo]");if(fo){F.dopo=fo.dataset.fo;renderSheet();return}
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
document.addEventListener("change",e=>{if(e.target.id==="fileIn"&&F){[...e.target.files].forEach(addPending)}});
document.addEventListener("input",e=>{if(!F)return;const f=e.target.dataset.ff;if(!f)return;const v=e.target.value;if(f==="res"||f==="r"||f==="risk")F[f]=v===""?null:+v;else F[f]=v;if(f==="ora"&&v){const [h,m]=v.split(":").map(Number);F.ses=sessFor(h+m/60)}if(f==="less")return;const sel=document.activeElement,id=sel&&sel.dataset.ff;renderSheet();if(id){const el=document.querySelector(`[data-ff="${id}"]`);if(el){el.focus();if(el.type==="text"||el.type==="number")try{el.setSelectionRange(el.value.length,el.value.length)}catch(x){}}}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSheet();$("pop").hidden=true}});
document.addEventListener("paste",e=>{if(!F||F.mode==="close")return;const items=[...(e.clipboardData?.items||[])].filter(i=>i.kind==="file"&&/^image\//.test(i.type));if(items.length){e.preventDefault();items.forEach(i=>addPending(i.getAsFile()));toast("Screenshot aggiunto.")}});
document.addEventListener("dragover",e=>{if(F){e.preventDefault()}});
document.addEventListener("drop",e=>{if(!F)return;e.preventDefault();[...(e.dataTransfer?.files||[])].forEach(addPending)});
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
