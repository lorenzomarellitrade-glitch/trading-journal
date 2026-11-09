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
 // ---- HOME
 await go("#home");
 ok("home: orologio parte",/\d\d:\d\d:\d\d/.test($("#clk").textContent));
 ok("home: finestre di Lore nel blocco Adesso",/la mia · mattina/.test($("#sess").textContent)&&/08:00-10:30|aperta/.test($("#sess").textContent));
 if(N===0){ok("home vuota: messaggio del primo trade",/nessun trade/i.test($("#view").textContent))}
 else{ok("home: kpi dai dati veri",$$(".kpi").length>=4&&/win rate/.test($("#view").textContent));ok("home: ultima lezione letta (la più recente)",/Pazienza sul 1H/.test($("#view").textContent))}
 await clk($('[data-pre="dubito di me"]'));ok("home: stato prima selezionato",$('[data-pre="dubito di me"]').classList.contains("on"));
 // ---- NUOVO TRADE dal calendario
 await go("#calendario");
 ok("calendario: 7 intestazioni e giorni",$$(".cal .h").length===7&&$$(".cal .d").length>=28);
 const oggi=new Date(),kOggi=oggi.getFullYear()+"-"+String(oggi.getMonth()+1).padStart(2,"0")+"-"+String(oggi.getDate()).padStart(2,"0");const day=$$(".cal .d[data-cal]").find(d=>d.dataset.cal===kOggi);await clk(day);
 ok("calendario: tocco sul giorno apre il nuovo trade",!$("#sheet").hidden&&/Nuovo trade/.test($("#sheetIn h2").textContent));
 ok("nuovo: data del giorno toccato",$('[data-ff="d"]').value===day.dataset.cal);
 ok("nuovo: stato 'prima' già segnato dalla home",/dubito di me/.test($(".sum").textContent));
 ok("nuovo: orario precompilato e sessione a pulsanti",/\d\d:\d\d/.test($('[data-ff="ora"]').value)&&$$("[data-fse]").length===5);
 await typ('[data-ff="ora"]',"16:45");ok("nuovo: cambiando l'orario la sessione segue",$('[data-fse="Londra + New York"]').classList.contains("on"));
 await clk($('[data-fse="Londra"]'));ok("nuovo: sessione scelta a mano",$('[data-fse="Londra"]').classList.contains("on"));
 await clk($('[data-fd="short"]'));for(let i=0;i<5;i++)await clk($('[data-fc="'+i+'"]'));
 ok("nuovo: checklist 5/5",/5\/5 · completa/.test($(".sum").textContent));
 await clk($('[data-fk="candela di rifiuto"]'));$("#newConf").value="mia confluenza";await clk($("#addConf"));
 ok("nuovo: confluenza nuova aggiunta e selezionata",$('[data-fk="mia confluenza"]')&&$('[data-fk="mia confluenza"]').classList.contains("on"));
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
 const ins=window.__W.filter(w=>w[0]==="insert");ok("salva: una riga inserita con i dati giusti",ins.length===1&&ins[0][1].direzione==="short"&&ins[0][1].checklist.join()==="1,1,1,1,1"&&ins[0][1].confluenze.includes("mia confluenza")&&ins[0][1].sessione==="Londra"&&ins[0][1].ora==="16:45"&&ins[0][1].aperto===true&&ins[0][1].stato_prima==="dubito di me"&&ins[0][1].rischio===1&&ins[0][1].rr===2,JSON.stringify(ins[0]&&ins[0][1]));
 ok("salva: screenshot caricato nella cartella dell'utente",window.__files.length===1&&window.__files[0].startsWith("uid-1/u"));
 const up=window.__W.filter(w=>w[0]==="update");ok("salva: percorso immagine scritto nel trade",up.length===1&&up[0][1].immagini.length===1);
 ok("calendario: il giorno mostra il trade aperto",/aperto/.test($("#view").textContent));
 // ---- CHIUSURA dalla home
 await go("#home");ok("home: blocco trade aperto",!!$("[data-close]"));ok("home: trade aperto con rischio e RR",/rischio 1 % · 1:2/.test($("#view").textContent));
 await clk($("[data-close]"));ok("chiudi: scheda di chiusura con galleria",/Chiudi il trade/.test($("#sheetIn h2").textContent)&&$$(".gal a").length===2);
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
 ok("home: lezione nuova in home",/Entrato presto/.test($("#view").textContent));
 // ---- LISTA TRADE
 await go("#trade");
 ok("trade: quadrotti con immagine",$$(".tcard").length===N+1&&$$(".tcard .im img").length>=1);
 await clk($('[data-tv="list"]'));ok("trade: vista lista",$$(".tlist .tr").length===N+1);
 await clk($('[data-tf="fx"]'));ok("trade: filtro forex",$$(".tlist .tr").length===window.__rows.filter(r=>r.strategia==="fx").length);
 await clk($('[data-tf="all"]'));await clk($('[data-tv="grid"]'));
 // ---- MODIFICA ed ELIMINA
 await clk($$(".tcard")[0]);ok("trade chiuso: si apre la scheda modificabile",/Il trade/.test($("#sheetIn h2").textContent)&&$$("[data-fc]").length===5&&$$("[data-fout]").length===4&&$('[data-fout="sl"]').classList.contains("on"));
 await clk($('[data-fout="tp"]'));await typ('[data-ff="rrTxt"]',"1:");await typ('[data-ff="rrTxt"]',"1:3");ok("modifica: RR corretto a metà, TP resta scelto e si ricalcola",$('[data-fout="tp"]').classList.contains("on")&&/· \+3 R/.test($("#sheetIn").textContent));
 await typ('[data-ff="rrTxt"]',"1:");await clk($("#saveSheet"));ok("modifica: trade chiuso senza esito non si salva",!$("#sheet").hidden&&(/Manca l'esito|RR non valido/.test($("#toast").textContent)));
 await typ('[data-ff="rrTxt"]',"1:2");
 await clk($("#delAsk"));ok("elimina: chiede conferma",!!$("#delYes"));
 await clk($("#delYes"));await W(150);
 ok("elimina: riga tolta e immagini rimosse",window.__rows.length===N&&window.__W.some(w=>w[0]==="remove")&&$("#sheet").hidden);
 // ---- STATISTICHE
 await go("#statistiche");
 ok("statistiche: 4 blocchi e grafici",$$(".blk").length===5&&$$("svg").length>=1);
 await clk($('[data-st="fx"]'));ok("statistiche: passa a forex",$('[data-st="fx"]').classList.contains("on")&&/swing/.test($("#view").textContent));
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
