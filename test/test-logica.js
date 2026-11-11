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
// RR e livelli (Lore, 2026-11-09): SL e TP in % dal rischio e dall'RR scritto 1:2
ok("parseRR: 1:2, 1:2,5, 1 : 3.5, 2:4",L.parseRR("1:2")===2&&L.parseRR("1:2,5")===2.5&&L.parseRR(" 1 : 3.5 ")===3.5&&L.parseRR("2:4")===2);
ok("parseRR: vuoto = null, sbagliato = NaN",L.parseRR("")===null&&L.parseRR(null)===null&&Number.isNaN(L.parseRR("abc"))&&Number.isNaN(L.parseRR("1:0"))&&Number.isNaN(L.parseRR("1:"))&&Number.isNaN(L.parseRR("0:2"))&&Number.isNaN(L.parseRR("1:100000")));
ok("parseRR: numero solo = 1:numero",L.parseRR("3")===3);
ok("fmtRR",L.fmtRR(2)==="1:2"&&L.fmtRR(2.5)==="1:2,5"&&L.fmtRR(null)==="");
ok("livelli: rischio 2 e 1:2 = SL -2, TP +4",(()=>{const v=L.livelli(2,2);return v.sl===-2&&v.tp===4})());
ok("livelli: arrotonda a 2 decimali",L.livelli(0.5,2.5).tp===1.25&&L.livelli(0.3,3.3).tp===0.99);
ok("livelli: senza rischio o RR = null",L.livelli(null,2).tp===null&&L.livelli(2,null).tp===null&&L.livelli(2,null).sl===-2);
ok("esitoDa: TP, SL, pareggio",(()=>{const a=L.esitoDa("tp",2,2),b=L.esitoDa("sl",2,2),c=L.esitoDa("be",2,2);return a.res===4&&a.r===2&&b.res===-2&&b.r===-1&&c.res===0&&c.r===0})());
ok("esitoDa: TP senza RR = null",L.esitoDa("tp",2,null)===null);
ok("rDaEsito: esito / rischio",L.rDaEsito(3,2)===1.5&&L.rDaEsito(-1,2)===-0.5&&L.rDaEsito(1,null)===null&&L.rDaEsito(null,2)===null);
ok("tipoEsito: riconosce TP, SL, pareggio, altro",L.tipoEsito(4,2,2)==="tp"&&L.tipoEsito(-2,2,2)==="sl"&&L.tipoEsito(0,2,2)==="be"&&L.tipoEsito(1.3,2,2)==="altro"&&L.tipoEsito(null,2,2)===null);
ok("rr: riga <-> trade",L.rowToT({...row,rr:"2.50"}).rr===2.5&&L.rowToT(row).rr===null&&L.tToRow(t({rr:2})).rr===2&&L.tToRow(t({})).rr===null);
ok("rischio di partenza 2 % per oro e forex",L.STRAT.xau.risk===2&&L.STRAT.fx.risk===2);
// Due posizioni (Lore, 2026-11-09): 2 % = 1 % a TP1 (1:1) + 1 % a TP finale
const P=(o)=>({r1:1,rr1:1,o1:null,o2:null,res2:null,...o});
ok("livelli2: 2 % diviso 1+1, TP1 1:1, TP 1:3",(()=>{const v=L.livelli2(2,P({}),3);return v.r2===1&&v.tp1===1&&v.sl1===-1&&v.tp2===3&&v.sl2===-1&&v.sl===-2})());
ok("livelli2: divisione 1,5 + 0,5",(()=>{const v=L.livelli2(2,P({r1:1.5}),3);return v.r2===0.5&&v.tp1===1.5&&v.tp2===1.5&&v.sl===-2})());
ok("livelli2: senza RR finale TP2 = null",L.livelli2(2,P({}),null).tp2===null);
ok("esito2: TP1 + TP = +4 %, +2 R",(()=>{const e=L.esito2(2,P({o1:"tp",o2:"tp"}),3);return e.res===4&&e.r===2})());
ok("esito2: TP1 + pareggio = +1 %, +0,5 R",(()=>{const e=L.esito2(2,P({o1:"tp",o2:"be"}),3);return e.res===1&&e.r===0.5})());
ok("esito2: due stop = -2 %, -1 R",(()=>{const e=L.esito2(2,P({o1:"sl",o2:"sl"}),3);return e.res===-2&&e.r===-1})());
ok("esito2: TP1 + altro +1,5 % = +2,5 %, +1,25 R",(()=>{const e=L.esito2(2,P({o1:"tp",o2:"altro",res2:1.5}),3);return e.res===2.5&&e.r===1.25})());
ok("esito2: manca una posizione = null",L.esito2(2,P({o1:"tp"}),3)===null&&L.esito2(2,P({o1:"tp",o2:"altro"}),3)===null);
ok("esito2: TP senza RR = null",L.esito2(2,P({o1:"tp",o2:"tp"}),null)===null);
ok("posizioni: riga <-> trade",(()=>{const r=L.tToRow(t({risk:2,rr:3,pos:P({o1:"tp",o2:"altro",res2:1.5})}));const b=L.rowToT({...row,posizioni:r.posizioni});return r.posizioni.rischio1===1&&r.posizioni.esito2==="altro"&&r.posizioni.esito2_pct===1.5&&b.pos.r1===1&&b.pos.rr1===1&&b.pos.o1==="tp"&&b.pos.res2===1.5})());
ok("posizioni: posizione unica = null",L.tToRow(t({})).posizioni===null&&L.rowToT(row).pos===null);

// ---- diario di sessione (2026-11-11)
const nn=(o)=>({id:"z",s:"xau",d:"2026-11-10",ora:"08:00",tf:"D",bias:null,txt:"",imgs:[],tipo:"nota",sic:null,piano:null,...o});
ok("time frame: oro W-M5, forex W-H1",L.TFS.xau.join()==="W,D,H4,H1,M15,M5"&&L.TFS.fx.join()==="W,D,H4,H1");
ok("nota: riga <-> nota",(()=>{const r=L.nToRow(nn({id:"n1",tf:"H4",bias:"up",txt:"ciao",imgs:["a"]}));const b=L.rowToN({...r,id:"v1"});return !("id" in r)&&r.tf==="H4"&&r.bias==="up"&&r.testo==="ciao"&&r.tipo==="nota"&&b.txt==="ciao"&&b.imgs[0]==="a"&&b.id==="v1"})());
ok("nota: fine sessione con sicurezza e piano",(()=>{const r=L.nToRow(nn({tipo:"fine",sic:4,piano:false,tf:null}));return r.tipo==="fine"&&r.sicurezza===4&&r.piano===false&&r.tf===null})());
ok("trade: motivo scritto e letto",L.tToRow(t({why:"perché sì"})).motivo==="perché sì"&&L.rowToT({...L.tToRow(t({why:"x"})),id:"q"}).why==="x");
{const N=[nn({id:"a",ora:"09:00"}),nn({id:"b",ora:"08:10"}),nn({id:"c",ora:"",tf:"H1"}),nn({id:"f",tipo:"fine",ora:"07:00"}),nn({id:"x",s:"fx"}),nn({id:"y",d:"2026-11-09"})];const T=[t({id:"t1",d:"2026-11-10",ora:"08:30"}),t({id:"t2",d:"2026-11-10",s:"fx"})];
 const F=L.flusso(N,T,"xau","2026-11-10");
 ok("flusso: ordine per orario, senza orario in fondo, fine sessione ultima",F.map(e=>e.x.id).join()==="b,t1,a,c,f",F.map(e=>e.x.id).join());
 ok("flusso: solo il mercato e il giorno scelti",F.length===5&&F.filter(e=>e.k==="trade").length===1);}
ok("giorni tra due date",L.giorni("2026-10-30","2026-11-02")===3&&L.giorni("2026-11-02","2026-11-02")===0);
{const N=[nn({id:"w",tf:"W",d:"2026-11-04",bias:"up"}),nn({id:"d1",tf:"D",d:"2026-11-05"}),nn({id:"h",tf:"H4",d:"2026-11-09"}),nn({id:"h2",tf:"H4",d:"2026-11-10",ora:"09:30"}),nn({id:"m",tf:"M5",d:"2026-11-10",ora:"08:40"})];
 const l=L.lettura(N,"xau","2026-11-10");const g=tf=>l.find(x=>x.tf===tf).n;
 ok("lettura: weekly valido 7 giorni, daily 3",g("W").id==="w"&&g("D")===null);
 ok("lettura: H4 solo del giorno, l'ultimo",g("H4").id==="h2"&&g("M5").id==="m"&&g("H1")===null);
 ok("lettura: fino a un orario esclude le note dopo",L.lettura(N,"xau","2026-11-10","09:00").find(x=>x.tf==="H4").n===null);
 ok("lettura forex: 4 time frame",L.lettura(N,"fx","2026-11-10").length===4);}
{const N=[nn({tf:"D",d:"2026-11-10",ora:"08:00",bias:"up"}),nn({tf:"D",d:"2026-11-11",ora:"08:00",bias:"dn"}),nn({tf:"H4",d:"2026-11-11",ora:"08:00",bias:"nt"})];
 const T=[t({d:"2026-11-10",ora:"09:00",dir:"long",res:1}),t({d:"2026-11-11",ora:"09:00",dir:"long",res:-0.5}),t({d:"2026-11-11",ora:"07:00",dir:"short",res:1})];
 const a=L.allineamento(N,T,"xau");const d=a.find(x=>x.k==="D");
 ok("allineamento: daily a favore 1 (vinto), contro 2; alle 7 vale ancora il daily di ieri",d.with.n===1&&d.with.wr===100&&d.without.n===2&&d.without.wr===50,d);
 ok("allineamento: bias neutro non conta",!a.find(x=>x.k==="H4"));}
{const N=[nn({tf:"H1",d:"2026-11-10",ora:"08:00",bias:"up"}),nn({tf:"H1",d:"2026-11-10",ora:"10:00",bias:"nt"}),nn({tf:"H4",d:"2026-11-10",ora:"",bias:"dn"})];const T=[t({d:"2026-11-10",ora:"11:00",dir:"long",res:1})];
 const a=L.allineamento(N,T,"xau");
 ok("allineamento: un neutro scritto dopo annulla il rialzo",!a.find(x=>x.k==="H1"));
 ok("allineamento: nota senza orario nello stesso giorno non conta",!a.find(x=>x.k==="H4"));}
ok("lettura: weekly vale fino a 6 giorni dopo, non 7",(()=>{const N=[nn({tf:"W",d:"2026-11-03"})];return L.lettura(N,"xau","2026-11-09")[0].n&&!L.lettura(N,"xau","2026-11-10")[0].n})());
{const N=[nn({tipo:"fine",sic:4,d:"2026-11-10"}),nn({tipo:"fine",sic:2,d:"2026-11-11"})];const T=[t({d:"2026-11-10",res:1}),t({d:"2026-11-11",res:-1})];
 const s=L.sicTable(N,T,"xau");ok("sicurezza: trade per giorno di fine sessione",s.length===2&&s.find(x=>x.k===4).wr===100&&s.find(x=>x.k===2).wr===0);}
{const N=[nn({tf:"D",bias:"up",txt:"riga 1\nriga 2",imgs:["p/1.png"]}),nn({tipo:"fine",sic:5,piano:true,txt:"bene",ora:"11:00"})];const T=[t({d:"2026-11-10",ora:"08:30",why:"pattern",rr:2,res:1,r:2,less:"ok"})];
 const md=L.esportaMd(N,T,"xau","2026-11-01","2026-11-30",{"p/1.png":"https://x/1.png"});
 ok("esporta: giorno, nota, trade, fine e link immagine",/## 10\.11\.2026/.test(md)&&/08:00 · D · ↑ rialzo: riga 1 \/ riga 2/.test(md)&&/!\[\]\(https:\/\/x\/1\.png\)/.test(md)&&/TRADE long/.test(md)&&/perché: pattern/.test(md)&&/FINE SESSIONE · sicurezza 5\/5 · piano sì: bene/.test(md),md);
 ok("esporta: fuori periodo niente",!/10\.11/.test(L.esportaMd(N,T,"xau","2026-12-01","2026-12-31",{})));}

// ---- statistiche del diario
{const T=[t({id:"a",piano:true,res:1,r:2}),t({id:"b",piano:true,res:-1,r:-1}),t({id:"c",piano:false,res:-1,r:-1}),t({id:"d",open:true,res:null})];
 const p=L.pianoTable(T,"xau");ok("piano: con 2 (50 %), senza 1 (0 %), aperti fuori",p.with.n===2&&p.with.wr===50&&p.without.n===1&&p.without.wr===0);
 ok("prove: solo da piano e vinti",L.prove(T,"xau").map(x=>x.id).join()==="a");}
{const N=[nn({tf:"W",bias:"up",ora:"07:00"}),nn({tf:"D",bias:"up",ora:"07:10"}),nn({tf:"H4",bias:"nt",ora:"07:20"})];
 const T=[t({d:"2026-11-10",ora:"09:00",dir:"long",res:1}),t({d:"2026-11-10",ora:"09:30",dir:"short",res:-1}),t({d:"2026-11-10",ora:"06:00",dir:"long",res:1})];
 const a=L.accordo(N,T,"xau");ok("accordo: long con W e D rialzo = d'accordo, short = misti, trade prima delle note escluso",a.with.n===1&&a.with.wr===100&&a.without.n===1&&a.without.wr===0,a);}
{const N=[nn({ora:"08:00"}),nn({ora:"08:30"}),nn({ora:"16:00",tipo:"fine"})];const T=[t({d:"2026-11-10",ora:"08:40",res:1}),t({d:"2026-11-10",ora:"08:10",res:-1}),t({d:"2026-11-10",ora:"",res:1})];
 const p=L.pazienza(N,T,"xau");ok("pazienza: minuti dalla prima nota (40 vinti, 10 persi)",p.vinti===40&&p.persi===10&&p.nV===1&&p.nP===1,p);}
ok("mediana pari e dispari",L.mediana([3,1,2])===2&&L.mediana([1,2,3,4])===2.5&&L.mediana([])===null);
ok("finestre: 8:00 e 18:59 dentro, 10:30 e 19:00 fuori",L.inFinestra("08:00")&&L.inFinestra("18:59")&&!L.inFinestra("10:30")&&!L.inFinestra("19:00")&&!L.inFinestra("13:00"));
ok("finestre: solo oro e con orario",L.finestre([t({ora:"09:00",res:1}),t({ora:"13:00",res:-1}),t({ora:"09:00",s:"fx",res:1})]).with.n===1);
{const N=[nn({d:"2026-11-09"}),nn({d:"2026-11-10"}),nn({d:"2026-11-10",tipo:"fine"}),nn({d:"2026-10-01"})];const T=[t({d:"2026-11-10"})];
 const c=L.costanza(N,T,"xau","2026-11-01","2026-11-30");ok("costanza: 2 giorni scritti, 1 chiusa, 1 senza trade",c.giorni===2&&c.chiuse===1&&c.senzaTrade===1,c);}
{const T=[t({id:"a",d:"2026-11-10",ora:"09:00",why:"Fallimento e rottura al 5' sul Supporto",res:1}),t({id:"b",d:"2026-11-10",ora:"09:30",why:"solo rottura",res:-1}),t({id:"c",d:"2026-11-09",why:"",res:1})];
 const N=[nn({d:"2026-11-10",ora:"08:00",txt:"testa e spalle sul 15"}),nn({d:"2026-11-10",ora:"10:00",txt:"zona estrema"})];
 const w=L.parole(N,T,"xau");const g=k=>w.find(x=>x.k===k);
 ok("parole: fallimento e rottura solo se ci sono tutte e due",g("fallimento e rottura").with.n===1&&g("fallimento e rottura").with.wr===100,w.map(x=>x.k));
 ok("parole: supporto vale come PRZ, maiuscole ignorate",g("supporto o resistenza (PRZ)").with.n===1);
 ok("parole: contano anche le note del giorno scritte prima dell'entrata",g("testa e spalle").with.n===2&&!g("zona estrema"));
 ok("parole: niente liquidità",!L.PAROLE.xau.some(p=>/liquidit/.test(p[0])));}
ok("checklist: conta solo i trade con almeno una spunta",L.conChecklist([t({check:[0,0,0,0,0]}),t({check:[1,0,0,0,0]})],"xau")===1);
ok("orario a mano: 9, 915, 9:15, 9.15, 21h30",L.parseOra("9")==="09:00"&&L.parseOra("915")==="09:15"&&L.parseOra("9:15")==="09:15"&&L.parseOra("9.15")==="09:15"&&L.parseOra("21h30")==="21:30"&&L.parseOra("16:5")==="16:05");
ok("orario a mano: vuoto e sbagliati",L.parseOra("")===""&&Number.isNaN(L.parseOra("25"))&&Number.isNaN(L.parseOra("9:70"))&&Number.isNaN(L.parseOra("ciao")));
// ---- coppia del forex
ok("coppia: normalizza",L.normCoppia("eur/usd")==="EURUSD"&&L.normCoppia(" gbp jpy ")==="GBPJPY"&&L.normCoppia(null)==="");
{const r=L.tToRow({s:"fx",c:"eur/usd",dir:"long",d:"2026-11-10"}),x=L.tToRow({s:"xau",c:"",dir:"long",d:"2026-11-10"});
 ok("coppia: nella riga solo sul forex",r.coppia==="EURUSD"&&!("coppia" in x)&&L.rowToT({strategia:"fx",coppia:"EURUSD"}).c==="EURUSD"&&L.rowToT({strategia:"xau"}).c==="");
 ok("coppia: forex senza coppia = null",L.tToRow({s:"fx",dir:"long",d:"2026-11-10"}).coppia===null&&L.nToRow({s:"fx",c:"usdjpy",d:"2026-11-10"}).coppia==="USDJPY"&&!("coppia" in L.nToRow({s:"xau",d:"2026-11-10"})));}
{const NN=[{s:"fx",c:"EURUSD",d:"2026-11-10",ora:"08:00",tf:"D",bias:"up",txt:"aoi eur",tipo:"nota"},{s:"fx",c:"GBPJPY",d:"2026-11-10",ora:"08:10",tf:"D",bias:"dn",txt:"engulfing gbp",tipo:"nota"},{s:"fx",c:"",d:"2026-11-10",ora:"08:20",tf:"W",bias:"up",txt:"generale",tipo:"nota"}];
 const TT=[{s:"fx",c:"EURUSD",d:"2026-11-10",ora:"09:00",dir:"long",res:2,r:2,piano:true,open:false,why:""},{s:"fx",c:"GBPJPY",d:"2026-11-10",ora:"09:30",dir:"long",res:-1,r:-1,piano:false,open:false,why:""},{s:"fx",c:"EURUSD",d:"2026-11-09",ora:"09:00",dir:"short",res:-1,r:-1,piano:true,open:false,why:""}];
 const d=tf=>c=>L.lettura(NN,"fx","2026-11-10",undefined,c).find(x=>x.tf===tf).n;
 ok("coppia: lettura della sola coppia, la nota generale vale per tutte",d("D")("EURUSD").txt==="aoi eur"&&d("D")("GBPJPY").txt==="engulfing gbp"&&d("W")("EURUSD").txt==="generale"&&d("D")(null).txt==="engulfing gbp");
 const al=L.allineamento(NN,TT,"fx").find(x=>x.k==="D");
 ok("coppia: bias confrontato con la nota della stessa coppia",al.with.n===1&&al.without.n===1,JSON.stringify(al));
 ok("coppia: testo del trade solo dalle note della sua coppia",/aoi eur/.test(L.testoTrade(NN,TT[0]))&&!/engulfing/.test(L.testoTrade(NN,TT[0]))&&/generale/.test(L.testoTrade(NN,TT[0])));
 const ct=L.coppiaTable(TT);
 ok("coppia: tabella per coppia",ct.length===2&&ct[0].k==="EURUSD"&&ct[0].n===2&&ct[0].wr===50&&ct[0].daPiano===2&&ct[1].k==="GBPJPY"&&ct[1].daPiano===0,JSON.stringify(ct));
 ok("coppia: elenco dalla più usata",L.coppie(NN,TT).join()==="EURUSD,GBPJPY");
 const [n2,t2]=L.filtraC(NN,TT,"GBPJPY");ok("coppia: filtro tiene la coppia e le note generali",t2.length===1&&n2.length===2&&L.filtraC(NN,TT,null)[1].length===3);
 ok("coppia: nel file per Sara",/TRADE EURUSD long/.test(L.esportaMd(NN,TT,"fx","2026-11-01","2026-11-30"))&&/GBPJPY · D/.test(L.esportaMd(NN,TT,"fx","2026-11-01","2026-11-30")));}
console.log((f?"FALLITI ":"TUTTI OK ")+(n-f)+"/"+n);process.exit(f?1:0);
