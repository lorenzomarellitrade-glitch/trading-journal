// Test della logica pura: node test/test-logica.js
const L=require("../logica.js");
let n=0,f=0;const ok=(name,c,x)=>{n++;if(!c){f++;console.log("FAIL "+name+(x!==undefined?" :: "+JSON.stringify(x):""))}else console.log("PASS "+name)};
const t=(o)=>({id:"x",s:"xau",dir:"long",d:"2026-11-03",ora:"09:00",ses:"Londra",risk:.5,check:[1,1,1,1,1],conf:[],prima:"lucido",dopo:null,piano:true,res:1,r:2,less:"",tv:"",imgs:[],open:false,...o});
// sessioni
ok("sessFor 9:30 = Londra",L.sessFor(9.5)==="Londra");
ok("sessFor 16:30 = Londra + New York",L.sessFor(16.5)==="Londra + New York");
ok("sessFor 20 = New York",L.sessFor(20)==="New York");
ok("sessFor 23:30 = Sydney",L.sessFor(23.5)==="Sydney");
ok("sessFor 3 = Tokyo",L.sessFor(3)==="Tokyo");
const st=L.sessState(9);ok("alle 9 è aperta 'La mia' e Londra",st.find(x=>x.n==="La mia").on&&st.find(x=>x.n==="Londra").on&&!st.find(x=>x.n==="La mia 2").on);
ok("alle 23:30 Sydney aperta (a cavallo della mezzanotte)",L.sessState(23.5).find(x=>x.n==="Sydney").on);
// tradingview
ok("tvImg da link condividi",L.tvImg("https://www.tradingview.com/x/K7n2kZ4C/")==="https://s3.tradingview.com/snapshots/k/K7n2kZ4C.png");
ok("tvImg link non snapshot = vuoto",L.tvImg("https://www.tradingview.com/chart/abc/")===""&&L.tvImg("")==="");
// conversioni
const row={id:"u1",strategia:"fx",direzione:"short",data:"2026-11-02",ora:"16:40",sessione:"Londra + New York",rischio:"0.40",checklist:[1,0,1,1,0],confluenze:["terzo tocco"],stato_prima:"dubito di me",stato_dopo:null,piano:null,esito_pct:null,r:null,lezione:"",tv_link:"",immagini:["a/b.png"],aperto:true};
const tt=L.rowToT(row);ok("rowToT: numeri e campi",tt.risk===.4&&tt.check.join()==="1,0,1,1,0"&&tt.open===true&&tt.res===null&&tt.imgs[0]==="a/b.png"&&tt.prima==="dubito di me");
const back=L.tToRow(tt);ok("tToRow: torna uguale",back.id==="u1"&&back.rischio===.4&&back.checklist.join()==="1,0,1,1,0"&&back.aperto===true&&back.esito_pct===null&&back.stato_prima==="dubito di me");
ok("tToRow: id provvisorio 'n…' non va al db",!("id" in L.tToRow(t({id:"n123"}))));
ok("tToRow: esito e piano del trade chiuso",(()=>{const r=L.tToRow(t({res:-0.5,r:-1,piano:false,open:false}));return r.esito_pct===-0.5&&r.r===-1&&r.piano===false&&r.aperto===false})());
// statistiche
const T=[t({res:1,r:2,conf:["a"],prima:"lucido",piano:true}),t({res:-.5,r:-1,conf:[],prima:"ci penso troppo",piano:false}),t({res:.8,r:1.6,conf:["a"],prima:"lucido",piano:true}),t({res:null,r:null,open:true}),t({s:"fx",res:.4,r:1,conf:["b"],prima:"lucido",piano:true})];
const s=L.stats(L.closedOf(T,"xau"));
ok("stats: n, win rate, somma",s.n===3&&Math.round(s.wr)===67&&Math.abs(s.sum-1.3)<1e-9,s);
ok("stats: R medio e profit factor",Math.abs(s.avgR-(2-1+1.6)/3)<1e-9&&Math.abs(s.pf-1.8/.5)<1e-9,s);
ok("stats vuote senza NaN",(()=>{const e=L.stats([]);return e.n===0&&e.wr===0&&e.pf===0&&!isNaN(e.avgR)})());
ok("stats: solo vincite = profit factor infinito",L.stats([t({res:1})]).pf===Infinity);
ok("closedOf esclude aperti e senza esito",L.closedOf(T).length===4&&L.closedOf(T,"fx").length===1);
const ct=L.confTable(T,"xau");ok("confTable: 'a' con 100 % vs senza 0 %",ct[0].k==="a"&&ct[0].with.n===2&&ct[0].with.wr===100&&ct[0].without.wr===0&&ct[0].lift===100,ct[0]);
ok("confTable: confluenze mai usate non compaiono",!ct.find(x=>x.k==="news passata"));
ok("allConf: base + quelle di Lore",L.allConf(T).includes("a")&&L.allConf(T).includes("liquidità presa sopra"));
const ck=L.checkTable(T,"xau");ok("checkTable: 5 voci con timeframe",ck.length===5&&ck[0].tf==="D · 4H"&&ck[0].with.n===3);
const stt=L.statoTable(T,"xau");ok("statoTable: lucido 100 %, ci penso troppo 0 %",stt.find(x=>x.k==="lucido").wr===100&&stt.find(x=>x.k==="ci penso troppo").wr===0);
ok("curve cumulata",L.curve(L.closedOf(T,"xau")).map(v=>+v.toFixed(2)).join()==="1,0.5,1.3");
ok("serieP: ultimi trade con piano rispettato",L.serieP(T)===2);
ok("serieP: piano null conta come rispettato",L.serieP([t({piano:false}),t({piano:null})])===1);
ok("weekOf: solo da lunedì",(()=>{const today=new Date(2026,10,5);const w=L.weekOf([t({d:"2026-11-02"}),t({d:"2026-11-01"}),t({d:"2026-11-04",open:true})],today);return w.length===1&&w[0].d==="2026-11-02"})());
ok("sortT: per data e ora",L.sortT([t({d:"2026-11-03",ora:"10:00"}),t({d:"2026-11-02",ora:"17:00"}),t({d:"2026-11-03",ora:"08:30"})]).map(x=>x.d+" "+x.ora).join("|")==="2026-11-02 17:00|2026-11-03 08:30|2026-11-03 10:00");
ok("pct e fmtD",L.pct(1.5)==="+1,50 %"&&L.pct(-0.25)==="-0,25 %"&&L.fmtD("2026-11-05")==="05.11.2026");
ok("esc",L.esc('<b>"x"</b>')==="&lt;b&gt;&quot;x&quot;&lt;/b&gt;"&&L.esc(null)==="");
console.log((f?"FALLITI ":"TUTTI OK ")+(n-f)+"/"+n);process.exit(f?1:0);
