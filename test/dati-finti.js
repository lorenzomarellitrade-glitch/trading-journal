// Righe finte per il test con archivio pieno (come arrivano da Supabase).
(function(){const pad=n=>String(n).padStart(2,"0"),d=new Date();const ago=n=>{const x=new Date(d);x.setDate(x.getDate()-n);return x.getFullYear()+"-"+pad(x.getMonth()+1)+"-"+pad(x.getDate())};
window.__rows=[
 {id:"r1",strategia:"xau",direzione:"long",data:ago(9),ora:"09:10",sessione:"Londra",rischio:"0.50",checklist:[1,1,1,1,1],confluenze:["liquidità presa sopra"],stato_prima:"lucido",stato_dopo:"lucido",piano:true,esito_pct:"1.00",r:"2.0",lezione:"Aspettare la rottura ha pagato.",tv_link:"https://www.tradingview.com/x/Qwer1234/",immagini:[],aperto:false},
 {id:"r2",strategia:"xau",direzione:"short",data:ago(7),ora:"16:50",sessione:"Londra + New York",rischio:"0.50",checklist:[1,1,1,0,1],confluenze:[],stato_prima:"ci penso troppo",stato_dopo:null,piano:false,esito_pct:"-0.50",r:"-1.0",lezione:"",tv_link:"",immagini:["uid-1/r2/a.png"],aperto:false},
 {id:"r3",strategia:"fx",direzione:"long",data:ago(3),ora:"08:30",sessione:"Londra",rischio:"0.40",checklist:[1,1,1,1,1],confluenze:["terzo tocco"],stato_prima:"lucido",stato_dopo:"lucido",piano:true,esito_pct:"0.80",r:"2.0",lezione:"Pazienza sul 1H.",tv_link:"",immagini:[],aperto:false}
];})();
