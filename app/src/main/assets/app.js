const KEY='gymdzpro_v2';const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{profile:{name:'',age:'',height:'',weight:'',level:'beginner',goal:'muscle',days:4,monthlyFee:''},sessions:0,measurements:[],payments:[],attendance:[],theme:'dark'};
state.payments=state.payments||[];state.attendance=state.attendance||[];state.measurements=state.measurements||[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const MEMBERS_KEY='gymdzpro_members_v1';
const getMembers=()=>{try{return JSON.parse(localStorage.getItem(MEMBERS_KEY)||'[]')}catch{return[]}};
const saveMembers=m=>localStorage.setItem(MEMBERS_KEY,JSON.stringify(m));
let members=getMembers();
function memberId(){return 'GYM-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function memberStatus(m){if(!m.endDate)return 'none';const d=Math.ceil((new Date(m.endDate+'T23:59:59')-new Date())/86400000);if(d<0)return 'expired';if(d<=7)return 'soon';return 'active'}
function renderMembers(){
 const list=$('#membersList');if(!list)return;
 members=getMembers();
 const q=($('#memberSearch')?.value||'').trim().toLowerCase();
 const filtered=members.filter(m=>(m.name||'').toLowerCase().includes(q)||(m.phone||'').includes(q));
 $('#membersTotal').textContent=members.length;
 $('#membersActive').textContent=members.filter(m=>memberStatus(m)==='active').length;
 $('#membersExpired').textContent=members.filter(m=>memberStatus(m)==='expired').length;
 $('#membersSoon').textContent=members.filter(m=>memberStatus(m)==='soon').length;
 list.innerHTML=filtered.length?filtered.map(m=>{
  const st=memberStatus(m);
  const label=st==='active'?'نشط':st==='soon'?'قريب الانتهاء':st==='expired'?'منتهي':'بدون اشتراك';
  return '<article class="measurement"><span><b>'+m.name+'</b><br><small>'+(m.phone||'لا يوجد هاتف')+'</small></span><span>'+label+' · '+(m.endDate||'—')+'</span></article>';
 }).join(''):'<p class="muted">لا يوجد منخرطون بعد.</p>';
}

const goalName={muscle:'بناء العضلات',cut:'تنشيف',strength:'القوة',fitness:'لياقة'};
const levelName={beginner:'مبتدئ',intermediate:'متوسط',advanced:'متقدم'};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function nav(v){$$('.view').forEach(x=>x.classList.remove('active'));$('#view-'+v).classList.add('active');$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.nav===v));render();scrollTo({top:0,behavior:'smooth'})}
$('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));$('#memberSearch')?.addEventListener('input',renderMembers);
$('#memberForm')?.addEventListener('submit',e=>{
 e.preventDefault();
 const name=$('#memberName').value.trim();
 const phone=$('#memberPhone').value.trim();
 const startDate=$('#memberStart').value;
 const endDate=$('#memberEnd').value;
 const fee=Number($('#memberFee').value||0);
 if(!name||!startDate||!endDate)return toast('أكمل البيانات المطلوبة');
 if(new Date(endDate)<new Date(startDate))return toast('تاريخ نهاية الاشتراك غير صحيح');
 const m={
  id:memberId(),
  name,
  phone,
  startDate,
  endDate,
  fee,
  createdAt:new Date().toISOString()
 };
 members=getMembers();
 members.push(m);
 saveMembers(members);
 $('#memberForm').reset();
 $('#memberModal').classList.add('hidden');
 renderMembers();
 toast('تمت إضافة المنخرط بنجاح ✓');
});
$('#closeMemberModal')?.addEventListener('click',()=>{
 $('#memberModal').classList.add('hidden');
});
$('#addMemberBtn')?.addEventListener('click',()=>{
 $('#memberModal').classList.remove('hidden');
 const d=new Date().toISOString().slice(0,10);
 if($('#memberStart'))$('#memberStart').value=d;
});
$('#addMemberBtn')?.addEventListener('click',()=>toast('نجهز الآن نموذج إضافة المنخرط'));
function fill(){const p=state.profile;['name','age','height','weight','level','goal','days','monthlyFee'].forEach(k=>{if($('#'+k))$('#'+k).value=p[k]??''});}
function render(){const p=state.profile;$('#helloName').textContent=p.name?`مرحباً ${p.name}، جاهز للتمرين؟`:'بطل، جاهز للتمرين؟';$('#dashWeight').textContent=p.weight||'—';$('#dashGoal').textContent=goalName[p.goal]||'—';$('#dashWorkouts').textContent=state.sessions;$('#dashStreak').textContent=Math.min(state.sessions,30);$('#progressWeight').textContent=p.weight?p.weight+' كغ':'—';$('#progressSessions').textContent=state.sessions;const days=Number(p.days)||4;const list=[['صدر + ترايسبس','Bench Press / Incline / Triceps'],['ظهر + بايسبس','Lat Pulldown / Row / Curl'],['أرجل','Squat / Leg Press / Leg Curl'],['أكتاف + بطن','Press / Lateral Raise / Core'],['Full Body','Squat / Press / Row / Core'],['كارديو واستشفاء','مشي سريع / إطالات / Mobility'],['اختبار القوة','تمارين مركبة بتقنية سليمة']];$('#workoutList').innerHTML=list.slice(0,Math.min(7,days)).map((x,i)=>`<article class="exercise"><div class="num">${i+1}</div><div><b>${x[0]}</b><br><small>${x[1]}</small></div><span>›</span></article>`).join('');
const w=Number(p.weight)||0;let cal=w?(p.goal==='cut'?w*28:p.goal==='muscle'?w*33:w*30):0;$('#calories').textContent=cal?Math.round(cal):'—';$('#protein').textContent=w?Math.round(w*1.8)+' غ':'—';const ms=state.measurements;$('#measurementList').innerHTML=ms.length?ms.slice().reverse().map(m=>`<div class="measurement"><span>${m.date}</span><span>${m.weight} كغ · صدر ${m.chest||'—'} · خصر ${m.waist||'—'}</span></div>`).join(''):'<p class="muted">لا توجد قياسات بعد.</p>';const vals=ms.map(m=>Number(m.weight)).filter(Boolean).slice(-12);if(p.weight)vals.push(Number(p.weight));const max=Math.max(...vals,1),min=Math.min(...vals,0);$('#weightChart').innerHTML=vals.length?vals.map((v,i)=>`<div class="bar" style="height:${Math.max(12,((v-min)/(max-min||1))*130+20)}px"><span>${v}</span></div>`).join(''):'<p class="muted">أضف قياساً لرؤية الرسم.</p>';renderPayments();renderAttendance();}
function money(n){return Number(n||0).toLocaleString('ar-DZ')}
function today(){return new Date().toISOString().slice(0,10)}
function renderPayments(){const now=new Date();const ym=now.toISOString().slice(0,7);const month=state.payments.filter(x=>x.date&&x.date.slice(0,7)===ym);const total=month.reduce((a,x)=>a+Number(x.amount||0),0);const due=Number(state.profile.monthlyFee||0)-total;$('#paidMonth').textContent=money(total);$('#dueAmount').textContent=money(Math.max(0,due));$('#lastPayment').textContent=state.payments.length?money(state.payments[state.payments.length-1].amount)+' دج':'—';$('#membershipStatus').textContent=total>0?'مدفوع':'غير مدفوع';$('#paymentList').innerHTML=state.payments.length?state.payments.slice().reverse().map(x=>`<div class="measurement"><span>${x.date}</span><span>${money(x.amount)} دج · ${x.type} · ${x.method}</span></div>`).join(''):'<p class="muted">لا توجد دفعات مسجلة.</p>'}
function renderAttendance(){const now=new Date();const ym=now.toISOString().slice(0,7);const month=state.attendance.filter(x=>x.date&&x.date.slice(0,7)===ym);$('#monthAttendance').textContent=month.length;$('#lastAttendance').textContent=state.attendance.length?state.attendance[state.attendance.length-1].date:'—';const days=Number(state.profile.days)||4;$('#attendanceRate').textContent=Math.min(100,Math.round((month.length/(days*4))*100))+'%';let streak=0;for(let i=state.attendance.length-1;i>=0;i--){streak++;if(i>0){const a=new Date(state.attendance[i].date),b=new Date(state.attendance[i-1].date);if((a-b)/86400000>1)break}}$('#attendanceStreak').textContent=streak;$('#attendanceList').innerHTML=state.attendance.length?state.attendance.slice().reverse().map(x=>`<div class="measurement"><span>${x.date}</span><span>✓ حضور${x.note?' · '+x.note:''}</span></div>`).join(''):'<p class="muted">لم يتم تسجيل حضور بعد.</p>'}
$('#paymentForm').addEventListener('submit',e=>{e.preventDefault();const amount=Number($('#payAmount').value);if(!amount)return toast('أدخل مبلغ الدفع');state.payments.push({amount,date:$('#payDate').value||today(),type:$('#payType').value,method:$('#payMethod').value,note:$('#payNote').value});save();e.target.reset();$('#payDate').value=today();toast('تم تسجيل الدفعة 💳');renderPayments()});
$('#addPaymentBtn').addEventListener('click',()=>{nav('payments');setTimeout(()=>$('#payAmount').focus(),50)});
$('#checkInBtn').addEventListener('click',()=>{const d=today();if(state.attendance.some(x=>x.date===d))return toast('تم تسجيل حضور اليوم مسبقاً');state.attendance.push({date:d});save();toast('تم تسجيل الحضور ✓');renderAttendance()});
$('#profileForm').addEventListener('submit',e=>{e.preventDefault();['name','age','height','weight','level','goal','days','monthlyFee'].forEach(k=>state.profile[k]=$('#'+k).value);save();$('#saveMsg').classList.remove('hidden');toast('تم حفظ الملف بنجاح');render()});
$('#completeWorkout').addEventListener('click',()=>{state.sessions++;save();toast('تم تسجيل الحصة 💪');render()});
$('#measurementForm').addEventListener('submit',e=>{e.preventDefault();const w=$('#mWeight').value;if(!w)return toast('أدخل الوزن أولاً');state.measurements.push({date:new Date().toLocaleDateString('ar-DZ'),weight:w,chest:$('#mChest').value,waist:$('#mWaist').value});state.profile.weight=w;save();e.target.reset();toast('تمت إضافة القياس');render()});
$('#exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gym-dz-pro-backup.json';a.click();URL.revokeObjectURL(a.href);toast('تم إنشاء النسخة الاحتياطية')});
$('#importFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.profile)throw Error();state=x;save();fill();render();renderMembers();toast('تم الاسترجاع بنجاح')}catch{toast('ملف النسخة الاحتياطية غير صالح')}};r.readAsText(f)});
$('#resetBtn').addEventListener('click',()=>{if(confirm('حذف جميع بيانات التطبيق من هذا الجهاز؟')){localStorage.removeItem(KEY);location.reload()}});
$('#themeBtn').addEventListener('click',()=>toast('الوضع الداكن هو الوضع الأساسي في GYM DZ PRO'));
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));fill();render();
