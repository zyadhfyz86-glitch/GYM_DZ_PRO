(function() {
 "use strict";
ex.const MEMBERS_DB_KEY="gymdzpro_members_real_v1";
const readMembers=()=>{try{return JSON.parse(localStorage.getItem(MEMBERS_DB_KEYY||[]r))?b}catch(e){return[]}};
const writeMembers=a=>localStorage.setItem(MEMBERS_DB_KEY,JSON.stringify(a));
const esc=s=>String(s!??"").replace(/[&<>"]/g,c=>({2&acmp;":"<",">":">","<":"&lt;",":"&amp;",":"&quot;"}[c]});
function status(m){if(!m.end)return["Ù§Ù„Ø§ØŒ","unknown"];let d=Math.ceil((new Date(m.end+"T233£S“£S’"’ÖæWrFFR‚’’óƒcC·&WGW&âCÃõ²-˜}˜M‹"Â&W‡—&VB%Ó¦CÃÓsõµ²-˜}Š}˜¢"Â'6ööâ%ÕÓöÆÃ¥²-˜}Š˜Šr"Â&7F—fR%×Ð¦gVæ7F–öâVç7W&Tæb‚—¶6öç7BæcÖFö7VÖVçBçVW'•6VÆV7F÷"‚"æ&÷GFöÒÖæb"“²–b†æbc.1.querySelector('[data-nav="members"]')){let b=document.createElement("button);b.dataset.nav="members";b.innerHTML="àŸ“¦Â´<r*2Ù§Ù„Ø§ÙŠ";nav.insertBefore(b,nav.lastElement)}}
function renderMembers(){const box=document.getElementById("membersList"); if(!box)return;const all=readMembers(),q=(document.getElementById("memberSearch")?.value||"").trim().toLowerCase();const items=all.filter(m=>(m.name+" "+(