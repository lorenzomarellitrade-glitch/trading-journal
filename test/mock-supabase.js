// Supabase finto in memoria per i test dell'interfaccia. Imita solo ciò che usa app.js.
(function(){
window.__rows=window.__rows||[];window.__note=window.__note||[];window.__W=[];window.__files=[];
let session=window.__NO_SESSION?null:{user:{id:"uid-1",email:"test@test.it"}};const listeners=[];
const okp=(data)=>Promise.resolve({data,error:null});
function query(tab){
  const q={_f:[],_op:null,_row:null,_ord:[]};
  q.select=()=>q;q.order=(c)=>{q._ord.push(c);return q};q.eq=(c,v)=>{q._f.push([c,v]);return q};q.single=()=>{q._single=true;return q};
  q.insert=(row)=>{q._op="insert";q._row=row;return q};q.update=(row)=>{q._op="update";q._row=row;return q};q.delete=()=>{q._op="delete";return q};
  q.then=(res,rej)=>{
    const K=tab==="journal_nota"?"__note":"__rows";let rows=window[K];const match=r=>q._f.every(([c,v])=>r[c]===v);
    let out;
    if(window.__FAIL){out={data:null,error:{message:"finto errore"}}}
    else if(q._op==="insert"){const r={...q._row,id:(K==="__note"?"v":"u")+(window["__c"+K]=Math.max(window["__c"+K]||0,window[K].length)+1),user_id:"uid-1"};window[K].push(r);window.__W.push([K==="__note"?"insertN":"insert",r]);out={data:r,error:null}}
    else if(q._op==="update"){const r=rows.find(match);Object.assign(r,q._row);window.__W.push([K==="__note"?"updateN":"update",r]);out={data:r,error:null}}
    else if(q._op==="delete"){window[K]=rows.filter(r=>!match(r));window.__W.push([K==="__note"?"deleteN":"delete",q._f]);out={data:null,error:null}}
    else{let l=rows.filter(match);q._ord.forEach(c=>l.sort((a,b)=>(a[c]||"")<(b[c]||"")?-1:1));out={data:q._single?l[0]:l,error:null}}
    return Promise.resolve(out).then(res,rej)};
  return q}
const sb={
  auth:{getSession:()=>okp({session}),onAuthStateChange:(fn)=>{listeners.push(fn);return{data:{subscription:{unsubscribe(){}}}}},
    signInWithPassword:async({email,password})=>{if(password==="giusta"){session={user:{id:"uid-1",email}};listeners.forEach(f=>f("SIGNED_IN",session));return{data:{session},error:null}}return{data:{},error:{message:"Invalid login credentials"}}},
    signOut:async()=>{session=null;listeners.forEach(f=>f("SIGNED_OUT",null));return{error:null}}},
  from:(tab)=>query(tab),
  storage:{from:()=>({upload:async(path,blob)=>{if(window.__FAILUP)return{data:null,error:{message:"upload finto fallito"}};window.__files.push(path);return{data:{path},error:null}},createSignedUrl:async(path)=>(window.__firme=(window.__firme||0)+1,{data:{signedUrl:"data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="},error:null}),createSignedUrls:async(paths,sec)=>(window.__scadLink=sec,{data:paths.map(p=>({path:p,signedUrl:"https://firmato/"+p})),error:null}),remove:async(paths)=>{window.__W.push(["remove",paths]);return{data:null,error:null}}})}
};
window.supabase={createClient:()=>sb};
window.JOURNAL_CONFIG={url:"https://finto.local",anonKey:"finta"};
})();
