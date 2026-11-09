// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb';
const P='hitsujikai/';
async function ticket(uid){const r=await req('PUT',P+'runs/'+uid,uid,{t:TS});const g=await req('GET',P+'runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
// s 匹、oj 人
const rec=(st,s,oj=0,n='テスト')=>({n,s,st,oj,v:1,t:TS});
const dk=()=>Math.floor((Date.now()+32400000)/86400000);

ex('ログインなしで始める',await req('PUT',P+'runs/'+U,null,{t:TS}),false);
let tk=await ticket(U);ex('始めた時刻を書く',tk.r,true);
const tk2=await ticket(U2);
ex('ほかの人の場所に書く',await req('PUT',P+'runs/'+U,U2,{t:TS}),false);
ex('始めてすぐ（1秒以内）にもう一度始める',await req('PUT',P+'runs/'+U,U,{t:TS}),false);
await sleep(1100);tk=await ticket(U);ex('1秒たてばまた始められる',tk.r,true);
ex('始めてすぐに200匹の記録を送る',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,200)),false);
await sleep(3100);
ex('始めた時刻がちがう記録',await req('PUT',P+'all/scores/'+U,U,rec(tk.st-5000,10)),false);
ex('実際の時間より多い匹数（3秒で80匹）',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,80)),false);
ex('0匹の記録',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,0)),false);
ex('匹数が小数',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,8.5)),false);
ex('おじさんの数がおかしい',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,10,-1)),false);
ex('ほかの人の場所に書く',await req('PUT',P+'all/scores/'+U2,U,rec(tk.st,10)),false);
ex('ふつうの記録（3秒で10匹）',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,10,1)),true);
ex('今日のランキングに、ds がおかしい記録',await req('PUT',P+'d/scores/'+U,U,{...rec(tk.st,10,1),dk:dk(),ds:dk()*1000000+11}),false);
ex('今日のランキングに書く',await req('PUT',P+'d/scores/'+U,U,{...rec(tk.st,10,1),dk:dk(),ds:dk()*1000000+10}),true);
ex('今日のランキングに、ちがう日で書く',await req('PUT',P+'d/scores/'+U2,U2,{...rec(tk2.st,10),dk:dk()-1,ds:(dk()-1)*1000000+10}),false);
ex('同じ回でもう一度送る（匹数を増やす）',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,11,1)),false);
ex('名前だけ変える',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,10,1,'なまえ')),true);
ex('今日のほうも名前だけ変える',await req('PUT',P+'d/scores/'+U,U,{...rec(tk.st,10,1,'なまえ'),dk:dk(),ds:dk()*1000000+10}),true);
ex('名前を変えるふりで匹数を変える',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,12,1,'なまえ2')),false);
ex('名前を変えるふりでおじさんの数を変える',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,10,5,'なまえ2')),false);
ex('13文字の名前',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,10,1,'あいうえおかきくけこさしす')),false);
tk=await ticket(U);await sleep(2500);
ex('前より悪い記録は全期間に載らない',await req('PUT',P+'all/scores/'+U,U,rec(tk.st,5)),false);
ex('今日のほうも前より悪い記録は載らない',await req('PUT',P+'d/scores/'+U,U,{...rec(tk.st,5),dk:dk(),ds:dk()*1000000+5}),false);
ex('おじさんに任せた',await req('PUT',P+'oji/'+U,U,{t:TS}),true);
ex('すぐにもう一度おじさんに任せた',await req('PUT',P+'oji/'+U,U,{t:TS}),false);
ex('ほかの人をおじさんに任せる',await req('PUT',P+'oji/'+U2,U,{t:TS}),false);
ex('だれでもランキングを読める',await req('GET',P+'all/scores',null),true);
ex('だれでも今日のランキングを読める',await req('GET',P+'d/scores',null),true);
ex('おじさんに任せた人の数を読める',await req('GET',P+'oji',null),true);
ex('ほかの人の始めた時刻は読めない',await req('GET',P+'runs/'+U,U2),false);
ex('hidden に書く',await req('PUT',P+'hidden/'+U,U,true),false);
ex('ほかのゲームの場所に書く',await req('PUT','bisu/ruler/'+U,U,{t:TS}),false);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
if(fail)process.exit(1);
