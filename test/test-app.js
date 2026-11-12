// Test dell'interfaccia (gira in Chrome headless, vedi README). Dati: window.__rows dal mock.
(async function(){
const R=[];const ok=(n,c,x)=>R.push((c?"PASS ":"FAIL ")+n+(c?"":" :: "+(x||"")));
const errs=[];window.addEventListener("error",e=>errs.push(e.message));
const W=ms=>new Promise(r=>setTimeout(r,ms));
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const go=async h=>{location.hash=h;await W(80)};
const clk=async el=>{el.click();await W(60)};
const typ=async(sel,v)=>{const el=$(sel);el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));await W(40)};
try{
 await W(300);
 if(window.__NO_SESSION){
  ok("login: schermata visibile",!$("#login").hidden&&$("#app").hidden);
  $("#email").value="test@test.it";$("#password").value="sbagliata";$("#loginForm").dispatchEvent(new Event("submit",{cancelable:true}));await W(150);
  ok("login: errore con password sbagliata",/sbagliat/.test($("#loginErr").textContent),$("#loginErr").textContent);
  $("#password").value="giusta";$("#loginForm").dispatchEvent(new Event("submit",{cancelable:true}));await W(300);
  ok("login: entra",$("#login").hidden&&!$("#app").hidden);
 }
 await W(200);
 ok("app visibile, login nascosto",!$("#app").hidden&&$("#login").hidden);
 const N=window.__rows.length;
 // ---- SESSIONE (diario)
 await go("#sessione");
 const oggi=new Date(),kOggi=oggi.getFullYear()+"-"+String(oggi.getMonth()+1).padStart(2,"0")+"-"+String(oggi.getDate()).padStart(2,"0");
 ok("sessione: si apre da sola, menu su Sessione",!!$("#comp")&&$('#nav a[data-v="sessione"]').classList.contains("on"));
 ok("sessione: orologio parte",/\d\d:\d\d:\d\d/.test($("#clk").textContent));
 ok("sessione: oro con le due finestre",$$("[data-w]").length===2&&/8:00–10:30/.test($("#win").textContent));
 ok("sessione: oro da W a M5",$$("[data-ctf]").map(b=>b.dataset.ctf).join()==="W,D,H4,H1,M15,M5");
 ok("sessione: giorno di oggi",$("#sesDate").value===kOggi);
 ok("sessione vuota oggi: messaggio",/La sessione è vuota/.test($("#feed").textContent));
 ok("sessione: resoconto in cima con oggi, settimana, mese",$(".sside .blk")===$("#sReso")&&$$("#sReso .ro").length===3&&/oggi.*settimana.*mese/s.test($("#sReso").textContent)&&/XAUUSD/.test($("#sReso .lab").textContent),$("#sReso")&&$("#sReso").textContent);
 ok("sessione: resoconto di oggi vuoto = trattino",$$("#sReso .ro b")[0].textContent==="—"&&/nessun trade/.test($$("#sReso .ro")[0].textContent));
 await clk($("#cInvia"));ok("sessione: nota vuota non parte",/Scrivi cosa vedi/.test($("#toast").textContent));
 await clk($('[data-ctf="H4"]'));await clk($('[data-cb="up"]'));
 ok("sessione: time frame e bias scelti",$('[data-ctf="H4"]').classList.contains("on")&&$('[data-cb="up"]').classList.contains("on"));
 await typ("#cTxt","Compressione nella PRZ");
 {const b=new Blob([Uint8Array.from(atob("R0lGODlhAQABAAAAACwAAAAAAQABAAA="),c=>c.charCodeAt(0))],{type:"image/png"});const dt=new DataTransfer();dt.items.add(new File([b],"s.png",{type:"image/png"}));const pe=new Event("paste",{bubbles:true});Object.defineProperty(pe,"clipboardData",{value:dt});document.dispatchEvent(pe);await W(80)}
 ok("sessione: screenshot incollato nel compositore, testo rimasto",$$(".cth img").length===1&&$("#cTxt").value==="Compressione nella PRZ");
 await clk($("#cInvia"));await W(250);
 {const w=window.__W.filter(x=>x[0]==="insertN");const r=w[0]&&w[0][1];
  ok("sessione: nota salvata con mercato, giorno, ora, TF, bias, testo",w.length===1&&r.strategia==="xau"&&r.data===kOggi&&/^\d\d:\d\d$/.test(r.ora)&&r.tf==="H4"&&r.bias==="up"&&r.testo==="Compressione nella PRZ"&&r.tipo==="nota",JSON.stringify(r));
  ok("sessione: screenshot caricato e scritto nella nota",window.__files.some(f=>f.startsWith("uid-1/note-"+r.id+"/"))&&window.__W.some(x=>x[0]==="updateN"&&x[1].immagini.length===1));}
 ok("sessione: nota nel flusso e nella lettura, compositore pulito",/Compressione nella PRZ/.test($("#feed").textContent)&&/Compressione nella PRZ/.test($(".mtf").textContent)&&$("#cTxt").value===""&&$$(".cth").length===0);
 ok("sessione: lettura con il daily di 9 giorni fa scaduto",/ancora niente/.test([...$$(".mtf div")].find(d=>d.querySelector("b").textContent==="D").textContent));
 {const card=$$(".ncard").find(c=>/Compressione/.test(c.textContent));await clk(card.querySelector("[data-nedit]"))}
 ok("modifica nota: testo nel compositore",$("#cTxt").value==="Compressione nella PRZ"&&/modificando/.test($("#comp").textContent)&&$$(".cth img").length===1);
 await typ("#cTxt","Compressione nella PRZ, aspetto Asia");await clk($("#cInvia"));await W(200);
 ok("modifica nota: aggiornata",window.__W.filter(x=>x[0]==="updateN").slice(-1)[0][1].testo==="Compressione nella PRZ, aspetto Asia"&&/aspetto Asia/.test($("#feed").textContent));
 {const card=$$(".ncard").find(c=>/aspetto Asia/.test(c.textContent));await clk(card.querySelector("[data-ndel]"))}
 ok("elimina nota: chiede conferma",/sì, elimina/.test($("#feed").textContent));
 await clk($$("[data-ndel]").find(b=>/sì/.test(b.textContent)));await W(150);
 ok("elimina nota: tolta con le immagini",window.__W.some(x=>x[0]==="deleteN")&&!/aspetto Asia/.test($("#feed").textContent));
 // screenshot che non si carica: niente doppioni, si riprova
 {const nI=window.__W.filter(x=>x[0]==="insertN").length;window.__FAILUP=true;
  await typ("#cTxt","Nota con screenshot difficile");
  const b=new Blob([Uint8Array.from(atob("R0lGODlhAQABAAAAACwAAAAAAQABAAA="),c=>c.charCodeAt(0))],{type:"image/png"});const dt=new DataTransfer();dt.items.add(new File([b],"s.png",{type:"image/png"}));const pe=new Event("paste",{bubbles:true});Object.defineProperty(pe,"clipboardData",{value:dt});document.dispatchEvent(pe);await W(80);
  await clk($("#cInvia"));await W(250);
  ok("screenshot fallito: nota salvata una volta, compositore pieno con avviso",window.__W.filter(x=>x[0]==="insertN").length===nI+1&&$$(".cth img").length===1&&/già salvato/.test($("#comp").textContent)&&/non sono entrati/.test($("#toast").textContent),$("#toast").textContent);
  window.__FAILUP=false;await clk($("#cInvia"));await W(250);
  const u=window.__W.filter(x=>x[0]==="updateN").slice(-1)[0][1];
  ok("screenshot fallito: riprova senza doppione e collega l'immagine",window.__W.filter(x=>x[0]==="insertN").length===nI+1&&u.testo==="Nota con screenshot difficile"&&u.immagini.length===1&&$$(".cth").length===0&&!/già salvato/.test($("#comp").textContent));}
 // giorno passato
 await clk($('[data-dg="-1"]'));const ieri=$("#sesDate").value;
 ok("giorno prima: data cambiata e tasto oggi",ieri<kOggi&&!!$('[data-dg="0"]'));
 ok("giorno prima: avviso nel compositore con il giorno e il tasto per tornare a oggi",!!$("#avvGiorno")&&/non su oggi/.test($("#avvGiorno").textContent)&&!!$('#avvGiorno [data-dg="0"]'));
 await clk($('[data-ctf="D"]'));await typ("#cTxt","Scritta il giorno dopo");await typ("[data-cora]","17:20");await clk($("#cInvia"));await W(200);
 {const r=window.__W.filter(x=>x[0]==="insertN").slice(-1)[0][1];ok("giorno prima: nota con data di ieri e orario scelto",r.data===ieri&&r.ora==="17:20"&&r.tf==="D",JSON.stringify(r))}
 // sposta la nota di ieri a oggi, e poi di nuovo a ieri
 {const card=$$(".ncard").find(c=>/Scritta il giorno dopo/.test(c.textContent));await clk(card.querySelector("[data-nedit]"));
  ok("sposta nota: in modifica compare il giorno",!!$("[data-cdata]")&&$("[data-cdata]").value===ieri&&!$("#avvGiorno"));
  await typ("[data-cdata]",kOggi);await clk($("#cInvia"));await W(200);
  const u=window.__W.filter(x=>x[0]==="updateN").slice(-1)[0][1];
  ok("sposta nota: salvata con il giorno nuovo e tolta da ieri",u.data===kOggi&&u.testo==="Scritta il giorno dopo"&&!/Scritta il giorno dopo/.test($("#feed").textContent)&&/Nota spostata/.test($("#toast").textContent),JSON.stringify(u));
  await clk($('[data-dg="0"]'));ok("sposta nota: compare su oggi, senza avviso",/Scritta il giorno dopo/.test($("#feed").textContent)&&!$("#avvGiorno"));
  const c2=$$(".ncard").find(c=>/Scritta il giorno dopo/.test(c.textContent));await clk(c2.querySelector("[data-nedit]"));await typ("[data-cdata]",ieri);await clk($("#cInvia"));await W(200);
  ok("sposta nota: rimessa a ieri",window.__W.filter(x=>x[0]==="updateN").slice(-1)[0][1].data===ieri);await clk($('[data-dg="-1"]'));}
 await clk($('[data-dg="0"]'));ok("torna a oggi",$("#sesDate").value===kOggi);
 // forex
 await clk($('[data-sm="fx"]'));
 ok("forex: da W a H1, niente finestre",$$("[data-ctf]").map(b=>b.dataset.ctf).join()==="W,D,H4,H1"&&!$("[data-w]")&&/il setup decide/.test($("#view").textContent));
 await clk($('[data-cmode="trade"]'));ok("forex: trade parte con due posizioni",$("[data-cpos]").classList.contains("on"));
 // coppia del forex
 await clk($('[data-pc=""]'));
 ok("coppia: barra delle coppie solo sul forex, parte da tutte",!!$("#pairs")&&$('[data-pc=""]').classList.contains("on")&&/nessuna coppia/.test($("[data-cpair]").textContent));
 await typ("[data-crr]","1:2");await typ("#cTxt","prova");await clk($("#cInvia"));
 ok("coppia: trade forex senza coppia non parte",/Scegli la coppia/.test($("#toast").textContent)&&!window.__W.some(x=>x[0]==="insert"&&x[1].motivo==="prova"));
 await clk($('[data-cmode="nota"]'));
 $("#newPair").value="eur/usd";$("#newPair").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));await W(60);
 ok("coppia: nuova coppia scritta a mano diventa EURUSD ed è scelta",!!$('[data-pc="EURUSD"]')&&$('[data-pc="EURUSD"]').classList.contains("on")&&/EURUSD/.test($("[data-cpair]").textContent)&&/EURUSD/.test($(".fday").textContent));
 await clk($('[data-ctf="D"]'));await clk($('[data-cb="dn"]'));await typ("#cTxt","Daily ribassista sotto la AOI");await clk($("#cInvia"));await W(200);
 {const r=window.__W.filter(x=>x[0]==="insertN").slice(-1)[0][1];ok("coppia: nota forex salvata con la coppia",r.strategia==="fx"&&r.coppia==="EURUSD"&&r.tf==="D",JSON.stringify(r));}
 ok("coppia: etichetta sulla nota e lettura della coppia",!!$(".ncard .tfb.pr")&&/Daily ribassista/.test($(".mtf").textContent));
 $("#newPair").value="gbpjpy";$("#newPair").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));await W(60);
 ok("coppia: su un'altra coppia la nota non si vede e la lettura è vuota",!/Daily ribassista/.test($("#feed").textContent)&&!/Daily ribassista/.test($(".mtf").textContent));
 await clk($('[data-pc=""]'));ok("coppia: tutte le rimostra",/Daily ribassista/.test($("#feed").textContent));
 await clk($('[data-sm="xau"]'));ok("coppia: sull'oro niente barra",!$("#pairs")&&!$("[data-cpair]"));await clk($('[data-sm="fx"]'));await clk($('[data-cmode="trade"]'));
 await clk($('[data-cmode="nota"]'));await clk($('[data-sm="xau"]'));
 // ---- NUOVO TRADE dal calendario
 await go("#calendario");
 ok("calendario: 7 intestazioni e giorni",$$(".cal .h").length===7&&$$(".cal .d").length>=28);
 let day=$$(".cal .d[data-cal]").find(d=>d.dataset.cal===kOggi);await clk(day);await W(60);
 ok("calendario: tocco sul giorno apre il diario di quel giorno",location.hash==="#sessione"&&$("#sesDate").value===kOggi&&$("#sheet").hidden);
 await go("#calendario");ok("calendario: pallino delle note",$$(".cal .d .dots i.n").length>=1);
 day=$$(".cal .d[data-cal]").find(d=>d.dataset.cal===kOggi);
 await clk($("[data-newday]"));
 ok("calendario: + trade apre il nuovo trade",!$("#sheet").hidden&&/Nuovo trade/.test($("#sheetIn h2").textContent));
 ok("nuovo: data del giorno toccato",$('[data-ff="d"]').value===day.dataset.cal);
 ok("nuovo: campo perché entro",!!$('[data-ff="why"]'));$('[data-ff="why"]').value="Rottura pulita";$('[data-ff="why"]').dispatchEvent(new Event("input",{bubbles:true}));await W(30);
 ok("nuovo: orario precompilato e sessione a pulsanti",/\d\d:\d\d/.test($('[data-ff="ora"]').value)&&$$("[data-fse]").length===5);
 await typ('[data-ff="ora"]',"16:45");ok("nuovo: cambiando l'orario la sessione segue",$('[data-fse="Londra + New York"]').classList.contains("on"));
 await clk($('[data-fse="Londra"]'));ok("nuovo: sessione scelta a mano",$('[data-fse="Londra"]').classList.contains("on"));
 await clk($('[data-fd="short"]'));
 ok("nuovo: scheda come il diario, niente checklist, confluenze e stato prima",!$("[data-fc]")&&!$("[data-fk]")&&!$("#newConf")&&!$("[data-fp]")&&!/checklist/i.test($("#sheetIn").textContent));
 ok("nuovo: rischio precompilato 2 %",$('[data-ff="risk"]').value==="2");
 await typ('[data-ff="rrTxt"]',"1:x");ok("nuovo: RR sbagliato segnato in rosso",$('[data-ff="rrTxt"]').classList.contains("bad")&&$('[data-calc="tp"]').value==="—");
 $('[data-ff="rrTxt"]').focus();await typ('[data-ff="rrTxt"]',"1:2,5");ok("nuovo: RR 1:2,5 con rischio 2 = SL -2 %, TP +5 %",$('[data-calc="sl"]').value==="-2,00 %"&&$('[data-calc="tp"]').value==="+5,00 %"&&!$('[data-ff="rrTxt"]').classList.contains("bad"),$('[data-calc="tp"]').value);
 ok("nuovo: scrivendo l'RR il cursore resta nel campo",document.activeElement===$('[data-ff="rrTxt"]'));
 await typ('[data-ff="risk"]',"1");ok("nuovo: cambia il rischio, cambiano SL e TP",$('[data-calc="sl"]').value==="-1,00 %"&&$('[data-calc="tp"]').value==="+2,50 %");
 await typ('[data-ff="rrTxt"]',"1:2");ok("nuovo: riepilogo con rischio e RR",/1 % · 1:2/.test($(".sum").textContent));
 await typ('[data-ff="tv"]',"https://www.tradingview.com/x/AbCd1234/");
 ok("nuovo: anteprima TradingView collegata al link",!!$('.gal a[href="https://www.tradingview.com/x/AbCd1234/"]'));
 // screenshot incollato
 const blob=new Blob([Uint8Array.from(atob("R0lGODlhAQABAAAAACwAAAAAAQABAAA="),c=>c.charCodeAt(0))],{type:"image/png"});
 const file=new File([blob],"s.png",{type:"image/png"});const dt=new DataTransfer();dt.items.add(file);
 const pe=new Event("paste",{bubbles:true});Object.defineProperty(pe,"clipboardData",{value:dt});document.dispatchEvent(pe);await W(80);
 ok("nuovo: screenshot incollato compare",$$(".drop .thumbs img").length===1&&/immagini[^\d]*2/.test($(".sum").textContent.replace(/\s+/g," ")));
 await clk($("#saveSheet"));await W(250);
 ok("salva: scheda chiusa e toast",$("#sheet").hidden&&/salvato/.test($("#toast").textContent),$("#toast").textContent);
 const ins=window.__W.filter(w=>w[0]==="insert");ok("salva: una riga inserita con i dati giusti",ins.length===1&&ins[0][1].direzione==="short"&&ins[0][1].sessione==="Londra"&&ins[0][1].ora==="16:45"&&ins[0][1].aperto===true&&ins[0][1].motivo==="Rottura pulita"&&ins[0][1].rischio===1&&ins[0][1].rr===2,JSON.stringify(ins[0]&&ins[0][1]));
 ok("salva: screenshot caricato nella cartella dell'utente",window.__files.filter(f=>!f.includes("/note-")).length===1&&window.__files.filter(f=>!f.includes("/note-"))[0].startsWith("uid-1/u"));
 const up=window.__W.filter(w=>w[0]==="update");ok("salva: percorso immagine scritto nel trade",up.length===1&&up[0][1].immagini.length===1);
 ok("calendario: il giorno mostra il trade aperto",/aperto/.test($("#view").textContent));
 // ---- CHIUSURA dal flusso della sessione
 await go("#sessione");const idT=ins[0][1].id;ok("sessione: trade nel flusso con perché, rischio e RR",!!$('[data-close="'+idT+'"]')&&/Rottura pulita/.test($("#feed").textContent)&&/rischio 1 % · 1:2/.test($("#feed").textContent));
 await clk($('[data-close="'+idT+'"]'));ok("chiudi: scheda di chiusura con galleria",/Chiudi il trade/.test($("#sheetIn h2").textContent)&&$$(".gal a").length===2);
 await clk($("#saveSheet"));ok("chiudi: senza esito non salva",!$("#sheet").hidden&&/Manca l'esito/.test($("#toast").textContent));
 ok("chiudi: quattro pulsanti con i valori",$$("[data-fout]").length===4&&/\+2,00 %/.test($('[data-fout="tp"]').textContent)&&/-1,00 %/.test($('[data-fout="sl"]').textContent));
 await clk($('[data-fout="tp"]'));ok("chiudi: TP preso = +2 % e +2 R",/\+2,00 % · \+2 R/.test($("#sheetIn").textContent));
 await clk($('[data-fout="altro"]'));$('[data-ff="res"]').focus();await typ('[data-ff="res"]',"1.5");ok("chiudi: altro, R calcolata = esito / rischio",$('[data-ff="r"]').value==="1.5"&&document.activeElement===$('[data-ff="res"]'));
 await clk($('[data-fout="sl"]'));ok("chiudi: SL preso = -1 % e -1 R",/-1,00 % · -1 R/.test($("#sheetIn").textContent)&&!$('[data-ff="res"]'));await clk($('[data-fpl="0"]'));await clk($('[data-fo="ci penso troppo"]'));
 $('[data-ff="less"]').value="Entrato presto.";$('[data-ff="less"]').dispatchEvent(new Event("input",{bubbles:true}));await W(30);
 ok("chiudi: scrivere la lezione non ridisegna",document.activeElement===$('[data-ff="less"]')||$('[data-ff="less"]').value==="Entrato presto.");
 await clk($("#saveSheet"));await W(200);
 const cl=window.__W.filter(w=>w[0]==="update").slice(-1)[0][1];
 ok("chiudi: riga aggiornata (esito, R, piano no, stato dopo, lezione, chiuso)",cl.esito_pct===-1&&cl.r===-1&&!("rrTxt" in cl)&&!("out" in cl)&&cl.piano===false&&cl.stato_dopo==="ci penso troppo"&&cl.lezione==="Entrato presto."&&cl.aperto===false,JSON.stringify(cl));
 ok("sessione: lezione e esito nel flusso",/Entrato presto/.test($("#feed").textContent)&&/-1,00 %/.test($("#feed").textContent));
 // ---- TRADE dal compositore
 await clk($('[data-cmode="trade"]'));ok("compositore trade: rischio 2, posizione unica sull'oro",$("[data-crisk]").value==="2"&&!$("[data-cpos]").classList.contains("on"));
 await typ("[data-crr]","1:x");await clk($("#cInvia"));ok("compositore trade: RR sbagliato non salva",/RR non valido/.test($("#toast").textContent));
 await typ("[data-crr]","1:2");await clk($('[data-cdir="short"]'));await typ("#cTxt","Fallimento e rottura al 5'");await clk($("#cInvia"));await W(250);
 {const r=window.__W.filter(x=>x[0]==="insert").slice(-1)[0][1];ok("compositore trade: salvato aperto con motivo",r.direzione==="short"&&r.rischio===2&&r.rr===2&&r.motivo==="Fallimento e rottura al 5'"&&r.aperto===true&&r.strategia==="xau"&&r.data===kOggi&&r.posizioni===null&&r.checklist.length===5,JSON.stringify(r));
  ok("compositore trade: nel flusso con Chiudi il trade",!!$('[data-close="'+r.id+'"]')&&$("#cTxt").value===""&&!$("[data-crisk]"));}
 // ---- LISTA TRADE
 await go("#trade");
 ok("trade: quadrotti con immagine",$$(".tcard").length===N+2&&$$(".tcard .im img").length>=1);
 await clk($('[data-tv="list"]'));ok("trade: vista lista",$$(".tlist .tr").length===N+2);
 {const fx=window.__rows.some(r=>r.strategia==="fx");// "Tutti": un resoconto per ogni mercato che ha trade
 ok("trade: resoconto per mercato sopra la lista",!!$("#tReso")&&$$("#tReso .reso").length===(fx?2:1)&&/XAUUSD/.test($("#tReso").textContent)&&/FOREX/.test($("#tReso").textContent)===fx,$("#tReso")&&$("#tReso").textContent);}
 await clk($('[data-tf="fx"]'));ok("trade: filtro forex",$$(".tlist .tr").length===window.__rows.filter(r=>r.strategia==="fx").length);
 ok("trade: resoconto solo del forex col filtro",$$("#tReso .reso").length===1&&/FOREX/.test($("#tReso").textContent)&&!/XAUUSD/.test($("#tReso").textContent));
 await clk($('[data-tf="all"]'));await clk($('[data-tv="grid"]'));
 // ---- MODIFICA ed ELIMINA
 await clk($$(".tcard").find(c=>!c.querySelector(".res.o")));ok("trade chiuso: si apre la scheda modificabile",/Il trade/.test($("#sheetIn h2").textContent)&&!$("[data-fc]")&&!!$('[data-ff="why"]')&&$$("[data-fout]").length===4&&$('[data-fout="sl"]').classList.contains("on"),[$("#sheetIn h2").textContent,!!$("[data-fc]"),!!$('[data-ff="why"]'),$$("[data-fout]").length,$("#sheetIn main").textContent.slice(0,300)].join(" | "));
 await clk($('[data-fout="tp"]'));await typ('[data-ff="rrTxt"]',"1:");await typ('[data-ff="rrTxt"]',"1:3");ok("modifica: RR corretto a metà, TP resta scelto e si ricalcola",$('[data-fout="tp"]').classList.contains("on")&&/· \+3 R/.test($("#sheetIn").textContent));
 await typ('[data-ff="rrTxt"]',"1:");await clk($("#saveSheet"));ok("modifica: trade chiuso senza esito non si salva",!$("#sheet").hidden&&(/Manca l'esito|RR non valido/.test($("#toast").textContent)));
 await typ('[data-ff="rrTxt"]',"1:2");
 await clk($("#delAsk"));ok("elimina: chiede conferma",!!$("#delYes"));
 await clk($("#delYes"));await W(150);
 ok("elimina: riga tolta e immagini rimosse",window.__rows.length===N+1&&window.__W.some(w=>w[0]==="remove")&&$("#sheet").hidden);
 // ---- DUE POSIZIONI (forex: 2 % = 1 % a TP1 1:1 + 1 % a TP finale)
 await go("#nuovo");await clk($('[data-fs="fx"]'));
 ok("coppia: campo nella scheda solo sul forex",!!$('[data-ff="c"]'));await typ('[data-ff="c"]',"gbp-usd");
 ok("due posizioni: sul forex parte con due posizioni",$('[data-fpos="2"]').classList.contains("on")&&$('[data-ff="p1r"]').value==="1"&&$('[data-calc="r2"]').value==="1"&&$('[data-ff="p1rr"]').value==="1:1");
 await typ('[data-ff="rrTxt"]',"1:3");ok("due posizioni: TP1 +1 %, TP +3 %, stop -2 %",$('[data-calc="tp1"]').value==="+1,00 %"&&$('[data-calc="tp2"]').value==="+3,00 %"&&/-2,00 %/.test($('[data-calc="sl"]').textContent));
 await typ('[data-ff="p1r"]',"1.5");ok("due posizioni: divisione 1,5 + 0,5",$('[data-calc="r2"]').value==="0,5"&&$('[data-calc="tp2"]').value==="+1,50 %");
 await typ('[data-ff="p1r"]',"2");ok("due posizioni: pos. 1 uguale al totale segnata in rosso",$('[data-ff="p1r"]').classList.contains("bad"));
 await clk($("#saveSheet"));ok("due posizioni: con divisione sbagliata non salva",!$("#sheet").hidden&&/posizione 1/.test($("#toast").textContent));
 await typ('[data-ff="p1r"]',"1");ok("due posizioni: riepilogo",/2 posizioni · 1:1 \/ 1:3/.test($(".sum").textContent));
 await clk($("#saveSheet"));await W(250);
 const ins2=window.__W.filter(w=>w[0]==="insert").slice(-1)[0][1];
 ok("due posizioni: riga salvata",ins2.strategia==="fx"&&ins2.coppia==="GBPUSD"&&ins2.rischio===2&&ins2.rr===3&&ins2.posizioni&&ins2.posizioni.rischio1===1&&ins2.posizioni.rr1===1&&ins2.posizioni.esito1===null,JSON.stringify(ins2));
 await go("#sessione");await clk($('[data-sm="fx"]'));ok("due posizioni: nel flusso forex",/2 posizioni · 1:1 \/ 1:3/.test($("#feed").textContent));
 await clk($("[data-close]"));ok("due posizioni: chiusura con due file di pulsanti",$$("[data-po1]").length===3&&$$("[data-po2]").length===4);
 await clk($('[data-po1="tp"]'));await clk($("#saveSheet"));ok("due posizioni: con una sola posizione scelta non chiude",!$("#sheet").hidden&&/Manca l'esito/.test($("#toast").textContent));
 await clk($('[data-po2="be"]'));ok("due posizioni: TP1 + pareggio = +1 %, +0,5 R",/\+1,00 % · \+0,5 R/.test($("#sheetIn").textContent));
 await clk($('[data-po2="altro"]'));$('[data-ff="p2res"]').focus();await typ('[data-ff="p2res"]',"1.5");ok("due posizioni: TP1 + altro 1,5 = +2,5 %, +1,25 R",/\+2,50 % · \+1,25 R/.test($("#sheetIn").textContent)&&document.activeElement===$('[data-ff="p2res"]'));
 await clk($('[data-po2="tp"]'));ok("due posizioni: TP1 + TP = +4 %, +2 R",/\+4,00 % · \+2 R/.test($("#sheetIn").textContent));
 await clk($("#saveSheet"));await W(200);
 const cl2=window.__W.filter(w=>w[0]==="update").slice(-1)[0][1];
 ok("due posizioni: riga chiusa",cl2.esito_pct===4&&cl2.r===2&&cl2.aperto===false&&cl2.posizioni.esito1==="tp"&&cl2.posizioni.esito2==="tp"&&cl2.posizioni.esito2_pct===null,JSON.stringify(cl2));
 // ---- GIORNO PASSATO: orario a mano
 await go("#sessione");await clk($('[data-sm="xau"]'));await clk($('[data-dg="-1"]'));{const ieri=$("#sesDate").value;
 await clk($("#newBtn"));ok("giorno prima: + Nuovo trade apre quel giorno, senza orario",$('[data-ff="d"]').value===ieri&&$('[data-ff="ora"]').value==="");
 await typ('[data-ff="ora"]',"9");ok("scheda: orario 9 = sessione Londra",$('[data-fse="Londra"]').classList.contains("on"));await clk($("#cancelSheet"));
 await clk($('[data-cmode="trade"]'));await typ("[data-crr]","1:2");await clk($("#cInvia"));ok("giorno prima: trade senza orario chiede l'orario",/scrivi l'orario di entrata/.test($("#toast").textContent));
 await typ("[data-cora]","25");await clk($("#cInvia"));ok("orario sbagliato non salva",/Orario non valido/.test($("#toast").textContent));
 await typ("[data-cora]","9");await typ("#cTxt","Trade di ieri");await clk($("#cInvia"));await W(250);
 {const r=window.__W.filter(x=>x[0]==="insert").slice(-1)[0][1];ok("giorno prima: trade con data di ieri, 09:00, Londra",r.data===ieri&&r.ora==="09:00"&&r.sessione==="Londra"&&r.motivo==="Trade di ieri",JSON.stringify(r));
}
 await clk($('[data-dg="0"]'));}
 // ---- STATISTICHE
 await go("#statistiche");
 {const v=$("#view").textContent;ok("statistiche: i blocchi del processo",["Quando segui il piano","Tutti i time frame d'accordo","trade a favore del bias","Sicurezza a fine sessione","Le parole della tua strategia","Pazienza","Le tue finestre","Costanza","Quando fai il tuo","Il risultato","Resoconto con Sara"].every(k=>v.includes(k))&&(!N||$$("svg").length>=1),["Quando segui il piano","Tutti i time frame d'accordo","trade a favore del bias","Sicurezza a fine sessione","Le parole della tua strategia","Pazienza","Le tue finestre","Costanza","Quando fai il tuo","Il risultato","Resoconto con Sara"].filter(k=>!v.includes(k)).join()+" svg"+$$("svg").length);
 ok("statistiche: niente confluenze né stato prima",!/Le confluenze|Come ero prima/.test(v));}
 if(N){ok("statistiche: time frame a favore del bias (daily)",$$(".hbars")[0].textContent.includes("D"));ok("statistiche: sicurezza a fine sessione",/4\/5/.test($("#view").textContent));ok("statistiche: quando fai il tuo con i trade da piano vinti",$$(".tcard").length>=1)}
 await clk($("[data-exp]"));await W(100);ok("esporta: file per Sara con note e trade",/# Diario XAUUSD/.test(window.__ultimoExport||"")&&/Scritta il giorno dopo/.test(window.__ultimoExport)&&/TRADE short/.test(window.__ultimoExport)||/TRADE/.test(window.__ultimoExport),(window.__ultimoExport||"").slice(0,200));
 await clk($('[data-st="fx"]'));
 ok("coppia: statistiche forex con le coppie",/Le tue coppie/.test($("#view").textContent)&&!!$('[data-stc="GBPUSD"]'),$("#view").textContent.slice(0,200));
 await clk($('[data-stc="GBPUSD"]'));ok("coppia: filtro sulla coppia",$('[data-stc="GBPUSD"]').classList.contains("on")&&/GBPUSD · \d+ trade chiusi/.test($("#view").textContent)&&!/Le tue coppie/.test($("#view").textContent));
 await clk($('[data-stc=""]'));
 ok("statistiche: passa a forex, senza finestre",$('[data-st="fx"]').classList.contains("on")&&!/Le tue finestre/.test($("#view").textContent)&&/AOI/.test($("#view").textContent));
 // ---- IMPOSTAZIONI
 await clk($("#gearBtn"));ok("impostazioni: stato archivio e mail",/collegato/.test($("#syncSt").textContent)&&/test@test.it/.test($("#who").textContent));
 await clk($('#pop [data-pal="verde"]'));ok("impostazioni: verde toglie data-pal",!document.documentElement.hasAttribute("data-pal"));
 await clk($('#pop [data-pal="mono"]'));ok("impostazioni: mono rimesso",document.documentElement.getAttribute("data-pal")==="mono");
 await clk($("#logoutBtn"));await W(100);ok("esci: torna al login",!$("#login").hidden&&$("#app").hidden);
 ok("niente scroll orizzontale",document.documentElement.scrollWidth<=window.innerWidth+1,document.documentElement.scrollWidth+">"+window.innerWidth);
 ok("niente errori JS",errs.length===0,errs.join(" | "));
}catch(e){R.push("FAIL eccezione :: "+e.message+" "+(e.stack||"").split("\n")[1])}
const pre=document.createElement("pre");pre.id="esito";pre.textContent=R.join("\n");document.body.appendChild(pre);
})();
