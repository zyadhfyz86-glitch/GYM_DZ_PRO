const KEY='gymdzpro_v2';const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{profile:{name:'',age:'',height:'',weight:'',level:'beginner',goal:'muscle',days:4,monthlyFee:''},sessions:0,measurements:[],payments:[],attendance:[],theme:'dark'};
state.payments=state.payments||[];state.attendance=state.attendance||[];state.measurements=state.measurements||[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const MEMBERS_KEY='gymdzpro_members_v1';
const getMembers=()=>{try{return JSON.parse(localStorage.getItem(MEMBERS_KEY)||'[]')}catch{return[]}};
const saveMembers=m=>localStorage.setItem(MEMBERS_KEY,JSON.stringify(m));
const memberById=id=>getMembers().find(m=>m.id===id)||null;
const memberPayments=m=>Array.isArray(m?.payments)?m.payments:[];
const memberAttendance=m=>Array.isArray(m?.attendance)?m.attendance:[];
const saveMember=m=>{const all=getMembers();const i=all.findIndex(x=>x.id===m.id);if(i<0)all.push(m);else all[i]=m;saveMembers(all);members=all;};
let members=getMembers();
function memberId(){return 'GYM-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function subscriptionNotifications(){
 const todayDate=today();
 const seen=JSON.parse(localStorage.getItem('gymdzpro_notifications_v1')||'{}');
 const notices=[];
 const all=getMembers();

 all.forEach(m=>{
  if(!m.endDate)return;
  const end=new Date(m.endDate+'T23:59:59');
  const days=Math.ceil((end-new Date())/86400000);
  let type='';
  let message='';

  if(days<0){
   type='expired';
   message=`🔴 اشتراك ${m.name} منتهي`;
  }else if(days<=3){
   type='3days';
   message=`🟠 اشتراك ${m.name} ينتهي خلال ${Math.max(0,days)} يوم`;
  }else if(days<=7){
   type='7days';
   message=`🟡 اشتراك ${m.name} ينتهي خلال ${days} أيام`;
  }else{
   return;
  }

  const key=m.id+'_'+type+'_'+todayDate;
  if(!seen[key]){
   notices.push({member:m,message,type,days});
   seen[key]=true;
  }
 });

 localStorage.setItem('gymdzpro_notifications_v1',JSON.stringify(seen));

 if(notices.length){
  notices.forEach(n=>toast(n.message));
 }

 return notices;
}

function checkSubscriptionNotifications(){
 setTimeout(subscriptionNotifications,500);
}
checkSubscriptionNotifications();

function showMemberQR(m){
 const modal=$('#qrModal'),box=$('#qrCanvas');
 if(!modal||!box||!m)return;
 $('#qrMemberName').textContent=m.name||'منخرط';
 const st=memberStatus(m);
 const label=st==='active'?'نشط':st==='soon'?'قريب الانتهاء':st==='expired'?'منتهي':'بدون اشتراك';
 $('#qrMemberInfo').textContent=`${m.id} · ${label} · ينتهي ${m.endDate||'—'}`;
 box.innerHTML='';
 if(typeof qrcode!=='function'){toast('مولّد QR غير متوفر');return;}
 const qr=qrcode(0,'M');
 qr.addData(JSON.stringify({type:'GYM-DZ-PRO-MEMBER',id:m.id}));
 qr.make();
 box.innerHTML=qr.createSvgTag({cellSize:5,margin:2});
 modal.classList.remove('hidden');
}
$('#closeQrModal')?.addEventListener('click',()=>$('#qrModal')?.classList.add('hidden'));

let qrStream=null;
let qrScanTimer=null;
let qrScanBusy=false;

function stopQrScanner(){
 if(qrScanTimer){clearTimeout(qrScanTimer);qrScanTimer=null}
 if(qrStream){
  qrStream.getTracks().forEach(t=>t.stop());
  qrStream=null;
 }
 const video=$('#qrVideo');
 if(video){video.pause();video.srcObject=null}
 qrScanBusy=false;
}

function qrScanResult(id){
 const m=memberById(id);
 if(!m){
  toast('الـ QR لا يخص منخرطاً مسجلاً');
  return false;
 }

 const st=memberStatus(m);
 if(st==='expired'){
  toast(`⚠️ ${m.name}: الاشتراك منتهي، لم يُسجل الحضور`);
  return true;
 }

 const arr=memberAttendance(m);
 const today=new Date().toISOString().slice(0,10);
 if(arr.some(x=>x.date===today)){
  toast(`الحضور مسجل اليوم: ${m.name}`);
  return true;
 }

 const now=new Date();
 arr.push({
  date:today,
  time:now.toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'})
 });
 m.attendance=arr;
 saveMember(m);

 if(typeof renderMembers==='function')renderMembers();
 if(typeof renderAttendance==='function')renderAttendance();
 if(typeof render==='function')render();

 toast(`✓ تم تسجيل حضور ${m.name}`);
 return true;
}

async function startQrScanner(){
 const modal=$('#scanQrModal');
 const video=$('#qrVideo');
 const canvas=$('#qrScanCanvas');
 const status=$('#qrScanStatus');

 if(!modal||!video||!canvas)return;

 if(typeof jsQR!=='function'){
  toast('ماسح QR غير متوفر');
  return;
 }

 stopQrScanner();
 modal.classList.remove('hidden');
 if(status)status.textContent='جاري تشغيل الكاميرا...';

 try{
  qrStream=await navigator.mediaDevices.getUserMedia({
   video:{facingMode:{ideal:'environment'}},
   audio:false
  });

  video.srcObject=qrStream;
  await video.play();

  if(status)status.textContent='وجّه الكاميرا نحو QR المنخرط';
  const ctx=canvas.getContext('2d',{willReadFrequently:true});

  const scan=()=>{
   if(!qrStream||video.readyState<2){
    qrScanTimer=setTimeout(scan,120);
    return;
   }

   const w=video.videoWidth;
   const h=video.videoHeight;

   if(!w||!h){
    qrScanTimer=setTimeout(scan,120);
    return;
   }

   canvas.width=w;
   canvas.height=h;
   ctx.drawImage(video,0,0,w,h);

   const image=ctx.getImageData(0,0,w,h);
   const code=jsQR(image.data,w,h,{inversionAttempts:'attemptBoth'});

   if(code&&code.data&&!qrScanBusy){
    qrScanBusy=true;

    try{
     const data=JSON.parse(code.data);
     if(data.type!=='GYM-DZ-PRO-MEMBER'||!data.id){
      throw new Error('INVALID_QR');
     }

     stopQrScanner();
     modal.classList.add('hidden');
     qrScanResult(data.id);
     return;
    }catch(e){
     qrScanBusy=false;
     if(status)status.textContent='هذا QR غير صالح. وجّه الكاميرا نحو QR المنخرط';
    }
   }

   qrScanTimer=setTimeout(scan,120);
  };

  scan();
 }catch(e){
  console.error(e);
  stopQrScanner();
  if(status)status.textContent='تعذر تشغيل الكاميرا. تأكد من منح صلاحية الكاميرا.';
  toast('تعذر تشغيل الكاميرا');
 }
}

$('#scanQrBtn')?.addEventListener('click',startQrScanner);

$('#closeScanQrModal')?.addEventListener('click',()=>{
 stopQrScanner();
 $('#scanQrModal')?.classList.add('hidden');
});


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
  const pays=memberPayments(m);
  const attends=memberAttendance(m);
  const total=pays.reduce((a,x)=>a+Number(x.amount||0),0);
  return `<article class="measurement member-card">
   <div><b>${m.name}</b><br><small>${m.phone||'لا يوجد هاتف'} · ${label} · ينتهي ${m.endDate||'—'}</small>
   <br><small>المدفوع: ${money(total)} دج · الحضور: ${attends.length}</small></div>
   <div class="member-actions">
    <button type="button" data-member-action="qr" data-member-id="${m.id}">▣ QR</button>
    <button type="button" data-member-action="attendance" data-member-id="${m.id}">✓ حضور</button>
    <button type="button" data-member-action="payment" data-member-id="${m.id}">💳 دفع</button>
    <button type="button" data-member-action="delete" data-member-id="${m.id}">حذف</button>
   </div>
  </article>`;
 }).join(''):'<p class="muted">لا يوجد منخرطون بعد.</p>';
}

$('#membersList')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-member-action]');if(!b)return;
 const id=b.dataset.memberId;
 const m=memberById(id);if(!m)return;
 const action=b.dataset.memberAction;
 if(action==='qr'){showMemberQR(m);return;}
 if(action==='attendance'){
  const d=today();
  m.attendance=memberAttendance(m);
  if(m.attendance.some(x=>x.date===d))return toast('تم تسجيل حضور هذا المنخرط اليوم مسبقاً');
  const st=memberStatus(m);
  if(st==='expired')return toast('⚠️ لا يمكن تسجيل الحضور: اشتراك المنخرط منتهي');
  m.attendance.push({date:d,time:new Date().toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'})});
  saveMember(m);renderMembers();toast(st==='soon'?'تم تسجيل الحضور ✓ الاشتراك قريب من الانتهاء':'تم تسجيل الحضور ✓');
 }
 if(action==='payment'){
  const amount=Number(prompt('أدخل مبلغ الدفع بالدج:',''+(m.fee||''))||0);
  if(!amount)return;
  m.payments=memberPayments(m);
  m.payments.push({amount,date:today(),type:'اشتراك',method:'نقدي'});
  saveMember(m);renderMembers();toast('تم تسجيل الدفعة 💳');
 }
 if(action==='delete'){
  if(!confirm('حذف المنخرط '+m.name+' وجميع دفعاته وحضوره؟'))return;
  saveMembers(getMembers().filter(x=>x.id!==id));
  members=getMembers();renderMembers();toast('تم حذف المنخرط');
 }
});
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
  payments:fee>0?[{
   amount:fee,
   date:today(),
   type:'اشتراك',
   method:'نقدي'
  }]:[],
  attendance:[],
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
function renderAI(){
 const box=$('#aiInsights');
 if(!box||!window.GymAI)return;

 const a=window.GymAI.analyze(state,getMembers());

 const cards=[
  ['🏋️','التدريب',a.training.sessions+' حصة',a.training.trend],
  ['👥','المنخرطون',a.gym.active+' نشط',a.gym.soon+' قريب الانتهاء'],
  ['💳','المدفوعات',money(a.gym.income),'هذا الشهر'],
  ['🥗','التغذية',a.nutrition.calories?a.nutrition.calories+' سعرة':'—',
   a.nutrition.protein?a.nutrition.protein+'غ بروتين':'أكمل الملف']
 ];

 box.innerHTML=cards.map(c=>
  '<article class="ai-mini">'+
  '<span>'+c[0]+'</span>'+
  '<b>'+c[1]+'</b>'+
  '<strong>'+c[2]+'</strong>'+
  '<small>'+c[3]+'</small>'+
  '</article>'
 ).join('');

 const tips=$('#aiTips');

 if(tips){
  tips.innerHTML=a.tips.map(x=>
   '<div>• '+x+'</div>'
  ).join('');
 }
}

let aiLastAnswer='';

function speakAI(text){
 const value=String(text||'').trim();
 if(!value)return;

 try{
  if(window.AndroidTTS && typeof window.AndroidTTS.speak==='function'){
   window.AndroidTTS.speak(value);
   return;
  }

  if(!('speechSynthesis' in window)){
   toast('النطق الصوتي غير مدعوم في هذا الجهاز');
   return;
  }

  window.speechSynthesis.cancel();

  const utterance=new SpeechSynthesisUtterance(value);
  const voices=window.speechSynthesis.getVoices()||[];

  const voice=
   voices.find(v=>/^ar-DZ$/i.test(v.lang)) ||
   voices.find(v=>/^ar/i.test(v.lang));

  utterance.lang=voice?voice.lang:'ar-DZ';
  if(voice)utterance.voice=voice;

  utterance.rate=0.9;
  utterance.pitch=1;
  utterance.volume=1;

  window.speechSynthesis.speak(utterance);
 }catch(e){
  console.error('AI_SPEECH',e);
  toast('تعذر تشغيل الصوت');
 }
}

function answerAI(q){
 const output=$('#aiAnswer');
 if(!output||!window.GymAI)return '';

 const question=String(q||'').trim();
 if(!question)return '';

 const answer=window.GymAI.answer(
  question,
  state,
  getMembers()
 );

 output.textContent=answer;
 output.classList.remove('hidden');

 aiLastAnswer=answer;

 const speakButton=$('#aiSpeak');
 if(speakButton)speakButton.classList.remove('hidden');

 speakAI(answer);
 return answer;
}

document.addEventListener('click',e=>{
 const mic=e.target.closest('#aiMic');
 if(!mic)return;

 if(mic.dataset.voiceBusy==='1'){
  if(window.AndroidSpeech&&typeof window.AndroidSpeech.stop==='function'){
   window.AndroidSpeech.stop();
  }
  return;
 }

 mic.dataset.voiceBusy='1';
 mic.classList.add('recording');
 mic.textContent='⏹️';

 if(window.speechSynthesis)window.speechSynthesis.cancel();

 if(window.AndroidSpeech&&typeof window.AndroidSpeech.start==='function'){
  window.AndroidSpeech.start();
 }else{
  mic.dataset.voiceBusy='0';
  mic.classList.remove('recording');
  mic.textContent='🎙️';
  toast('ميزة التحدث الصوتي غير متاحة');
 }
});
 
function initAIVoice(){
 const mic=$('#aiMic');
 const input=$('#aiQuestion');

 if(!mic||!input||mic.dataset.ready)return;
 mic.dataset.ready='1';

 let listening=false;

 window.onNativeSpeechStart=()=>{
  listening=true;
  mic.classList.add('recording');
  mic.textContent='⏹️';
 };

 window.onNativeSpeechEnd=()=>{
  listening=false;
  mic.classList.remove('recording');
  mic.textContent='🎙️';
 };

 window.onNativeSpeechResult=(text)=>{
  const value=String(text||'').trim();
  if(!value)return;
  input.value=value;
  answerAI(value);
 };

 window.onNativeSpeechError=(error)=>{
  listening=false;
  mic.classList.remove('recording');
  mic.textContent='🎙️';

  if(String(error)==='not-allowed'){
   toast('اسمح للتطبيق باستعمال الميكروفون');
  }else if(String(error)==='unavailable'){
   toast('التعرف على الكلام غير متاح في الجهاز');
  }else{
   toast('تعذر التعرف على الكلام، عاود جرّب');
  }
 };

 mic.addEventListener('click',()=>{
  toast('🎙️ الزر استقبل الضغط');
  try{
   if(listening){
    if(window.AndroidSpeech&&typeof window.AndroidSpeech.stop==='function'){
     window.AndroidSpeech.stop();
    }
   }else{
    if(window.speechSynthesis)window.speechSynthesis.cancel();

    if(window.AndroidSpeech&&typeof window.AndroidSpeech.start==='function'){
     window.AndroidSpeech.start();
    }else{
     toast('ميزة التحدث الصوتي غير متاحة');
    }
   }
  }catch(e){
   console.error('AI_NATIVE_SPEECH',e);
   toast('تعذر تشغيل الميكروفون');
  }
 });
}

function initAI(){
 const form=$('#aiAskForm');

 if(form&&!form.dataset.ready){
  form.dataset.ready='1';

  form.addEventListener('submit',e=>{
   e.preventDefault();

   const input=$('#aiQuestion');
   if(!input)return;

   const q=input.value.trim();
   if(!q)return;

   answerAI(q);
   input.value='';
  });
 }

 const speak=$('#aiSpeak');

 if(speak&&!speak.dataset.ready){
  speak.dataset.ready='1';

  speak.addEventListener('click',()=>{
   if(aiLastAnswer)speakAI(aiLastAnswer);
  });
 }

 const refresh=$('#aiRefresh');

 if(refresh&&!refresh.dataset.ready){
  refresh.dataset.ready='1';

  refresh.addEventListener('click',()=>{
   renderAI();
   toast('تم تحديث التحليل الذكي 🤖');
  });
 }

 initAIVoice();
}

function nav(view){
  $$('.view').forEach(v=>{
    v.classList.toggle('active',v.id==='view-'+view);
  });
  $$('[data-nav]').forEach(b=>{
    b.classList.toggle('active',b.dataset.nav===view);
  });
  if(view==='members')renderMembers();
  if(view==='ai'){initAI();renderAI();}
  window.scrollTo({top:0,behavior:'smooth'});
}


$$('[data-nav]').forEach(b=>{
  b.addEventListener('click',()=>nav(b.dataset.nav));
});
$$('[data-more-nav]').forEach(b=>{
  b.addEventListener('click',()=>nav(b.dataset.moreNav));
});

function fill(){const p=state.profile;['name','age','height','weight','level','goal','days','monthlyFee'].forEach(k=>{if($('#'+k))$('#'+k).value=p[k]??''});}
const goalName={muscle:'بناء العضلات',cut:'تنشيف',strength:'القوة',fitness:'لياقة'};
function render(){const p=state.profile;$('#helloName').textContent=p.name?`مرحباً ${p.name}، جاهز للتمرين؟`:'بطل، جاهز للتمرين؟';$('#dashWeight').textContent=p.weight||'—';$('#dashGoal').textContent=goalName[p.goal]||'—';$('#dashWorkouts').textContent=state.sessions;$('#dashStreak').textContent=Math.min(state.sessions,30);$('#progressWeight').textContent=p.weight?p.weight+' كغ':'—';$('#progressSessions').textContent=state.sessions;const days=Number(p.days)||4;const list=[['صدر + ترايسبس','Bench Press / Incline / Triceps'],['ظهر + بايسبس','Lat Pulldown / Row / Curl'],['أرجل','Squat / Leg Press / Leg Curl'],['أكتاف + بطن','Press / Lateral Raise / Core'],['Full Body','Squat / Press / Row / Core'],['كارديو واستشفاء','مشي سريع / إطالات / Mobility'],['اختبار القوة','تمارين مركبة بتقنية سليمة']];$('#workoutList').innerHTML=list.slice(0,Math.min(7,days)).map((x,i)=>`<article class="exercise"><div class="num">${i+1}</div><div><b>${x[0]}</b><br><small>${x[1]}</small></div><span>›</span></article>`).join('');
  renderWorkoutPlan();
const w=Number(p.weight)||0;let cal=w?(p.goal==='cut'?w*28:p.goal==='muscle'?w*33:w*30):0;$('#calories').textContent=cal?Math.round(cal):'—';$('#protein').textContent=w?Math.round(w*1.8)+' غ':'—';const ms=state.measurements;$('#measurementList').innerHTML=ms.length?ms.slice().reverse().map(m=>`<div class="measurement"><span>${m.date}</span><span>${m.weight} كغ · صدر ${m.chest||'—'} · خصر ${m.waist||'—'}</span></div>`).join(''):'<p class="muted">لا توجد قياسات بعد.</p>';const vals=ms.map(m=>Number(m.weight)).filter(Boolean).slice(-12);if(p.weight)vals.push(Number(p.weight));const max=Math.max(...vals,1),min=Math.min(...vals,0);$('#weightChart').innerHTML=vals.length?vals.map((v,i)=>`<div class="bar" style="height:${Math.max(12,((v-min)/(max-min||1))*130+20)}px"><span>${v}</span></div>`).join(''):'<p class="muted">أضف قياساً لرؤية الرسم.</p>';renderPayments();renderAttendance();}
function money(n){return Number(n||0).toLocaleString('ar-DZ')}
function today(){return new Date().toISOString().slice(0,10)}

function renderWorkoutPlan(){
  const p=state.profile||{};
  const days=Math.max(1,Math.min(7,Number(p.days)||4));
  const goal=p.goal||'muscle';
  const level=p.level||'beginner';
  const goalName={muscle:'بناء العضلات',cut:'تنشيف',strength:'القوة',fitness:'لياقة'};
  const levelName={beginner:'مبتدئ',intermediate:'متوسط',advanced:'متقدم'};
  const plans={
    muscle:[
      ['صدر + ترايسبس',['Bench Press — 4 × 8-12','Incline Dumbbell Press — 3 × 10-12','Cable Fly — 3 × 12-15','Triceps Pushdown — 3 × 10-15']],
      ['ظهر + بايسبس',['Lat Pulldown — 4 × 8-12','Seated Row — 3 × 10-12','One Arm Row — 3 × 10','Biceps Curl — 3 × 10-15']],
      ['أرجل',['Squat — 4 × 8-12','Leg Press — 3 × 10-12','Leg Curl — 3 × 10-15','Calf Raise — 4 × 12-15']],
      ['أكتاف + بطن',['Shoulder Press — 4 × 8-12','Lateral Raise — 3 × 12-15','Rear Delt Fly — 3 × 12-15','Plank — 3 × 30-60ث']],
      ['صدر + ظهر',['Bench Press — 3 × 8-12','Lat Pulldown — 3 × 8-12','Incline Press — 3 × 10','Row — 3 × 10']],
      ['أرجل + أكتاف',['Leg Press — 3 × 10','Leg Curl — 3 × 12','Shoulder Press — 3 × 10','Lateral Raise — 3 × 15']],
      ['Full Body',['Squat — 3 × 10','Bench Press — 3 × 10','Row — 3 × 10','Core — 3 × 15']]
    ],
    strength:[
      ['قوة — دفع',['Bench Press — 5 × 5','Overhead Press — 4 × 5','Dips — 3 × 6-10']],
      ['قوة — سحب',['Deadlift — 5 × 3','Barbell Row — 4 × 5','Lat Pulldown — 3 × 8']],
      ['قوة — أرجل',['Squat — 5 × 5','Leg Press — 3 × 8','Leg Curl — 3 × 10']],
      ['قوة — شامل',['Bench Press — 4 × 5','Squat — 4 × 5','Row — 4 × 6']]
    ],
    cut:[
      ['صدر + كارديو',['Bench Press — 3 × 10-12','Incline Press — 3 × 12','Cable Fly — 3 × 15','مشي سريع — 15 دقيقة']],
      ['ظهر + كارديو',['Lat Pulldown — 3 × 12','Row — 3 × 12','Curl — 3 × 15','مشي سريع — 15 دقيقة']],
      ['أرجل',['Squat — 3 × 10','Leg Press — 3 × 12','Leg Curl — 3 × 15','دراجة — 15 دقيقة']],
      ['أكتاف + بطن',['Shoulder Press — 3 × 10','Lateral Raise — 3 × 15','Plank — 3 × 45ث','مشي — 15 دقيقة']],
      ['Full Body',['Squat — 3 × 10','Press — 3 × 10','Row — 3 × 12','Cardio — 20 دقيقة']],
      ['كارديو واستشفاء',['مشي سريع — 25 دقيقة','Mobility — 10 دقائق','إطالات — 10 دقائق']],
      ['Full Body خفيف',['Leg Press — 3 × 12','Chest Press — 3 × 12','Pulldown — 3 × 12']]
    ],
    fitness:[
      ['لياقة شاملة',['Squat — 3 × 12','Push Up — 3 × 10','Row — 3 × 12','Plank — 3 × 45ث']],
      ['قوة وتحمل',['Leg Press — 3 × 12','Chest Press — 3 × 12','Lat Pulldown — 3 × 12','مشي — 15 دقيقة']],
      ['كارديو + Core',['مشي سريع — 20 دقيقة','Bike — 15 دقيقة','Plank — 3 × 45ث','Crunch — 3 × 15']],
      ['Full Body',['Squat — 3 × 12','Press — 3 × 12','Row — 3 × 12','Core — 3 × 15']],
      ['تحمل',['Lunges — 3 × 10','Push Up — 3 × 10','Pulldown — 3 × 12','Cardio — 20 دقيقة']],
      ['استشفاء',['مشي — 20 دقيقة','Mobility — 15 دقيقة','إطالات — 10 دقائق']],
      ['نشاط حر',['Full Body خفيف — 3 × 12','Cardio — 20 دقيقة']]
    ]
  };
  const plan=plans[goal]||plans.muscle;
  $('#planGoal').textContent=goalName[goal]||'بناء العضلات';
  $('#planLevel').textContent=levelName[level]||'مبتدئ';
  $('#planDays').textContent=days+' أيام / أسبوع';
  $('#workoutList').innerHTML=plan.slice(0,days).map((x,i)=>`
    <article class="exercise training-day">
      <div class="num">${i+1}</div>
      <div class="training-content"><b>اليوم ${i+1} — ${x[0]}</b>
      <div class="training-exercises">${x[1].map(e=>`<div>✓ ${e}</div>`).join('')}</div>
      <small class="muted">راحة بين المجموعات: 60–120 ثانية · ابدأ بوزن مناسب لتقنية سليمة.</small></div>
    </article>`).join('');
}

function renderPayments(){const now=new Date();const ym=now.toISOString().slice(0,7);const month=state.payments.filter(x=>x.date&&x.date.slice(0,7)===ym);const total=month.reduce((a,x)=>a+Number(x.amount||0),0);const due=Number(state.profile.monthlyFee||0)-total;$('#paidMonth').textContent=money(total);$('#dueAmount').textContent=money(Math.max(0,due));$('#lastPayment').textContent=state.payments.length?money(state.payments[state.payments.length-1].amount)+' دج':'—';$('#membershipStatus').textContent=total>0?'مدفوع':'غير مدفوع';$('#paymentList').innerHTML=state.payments.length?state.payments.slice().reverse().map(x=>`<div class="measurement"><span>${x.date}</span><span>${money(x.amount)} دج · ${x.type} · ${x.method}</span></div>`).join(''):'<p class="muted">لا توجد دفعات مسجلة.</p>'}
function renderAttendance(){
 const d=today(),ym=d.slice(0,7);
 members=getMembers();
 const all=[],month=[],todayRows=[];
 members.forEach(m=>{
  memberAttendance(m).forEach(x=>{
   const r={member:m,...x};
   all.push(r);
   if(x.date&&x.date.slice(0,7)===ym)month.push(r);
   if(x.date===d)todayRows.push(r);
  });
 });
 const days=[...new Set(month.map(x=>x.date))].sort();
 let streak=0;
 for(let i=days.length-1;i>=0;i--){
  streak++;
  if(i&&Math.round((new Date(days[i])-new Date(days[i-1]))/86400000)>1)break;
 }
 if($('#todayAttendance'))$('#todayAttendance').textContent=todayRows.length;
 if($('#monthAttendance'))$('#monthAttendance').textContent=month.length;
 all.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.time||'').localeCompare(a.time||''));
 if($('#lastAttendance'))$('#lastAttendance').textContent=all.length?all[0].date+' · '+(all[0].time||'—'):'—';
 if($('#attendanceStreak'))$('#attendanceStreak').textContent=streak;

 const q=($('#attendanceMemberSearch')?.value||'').trim().toLowerCase();
 const filtered=members.filter(m=>(m.name||'').toLowerCase().includes(q)||(m.phone||'').includes(q));
 const box=$('#attendanceMemberList');
 if(box)box.innerHTML=filtered.length?filtered.map(m=>{
  const st=memberStatus(m),has=memberAttendance(m).some(x=>x.date===d);
  const label=st==='active'?'نشط':st==='soon'?'قريب الانتهاء':st==='expired'?'منتهي':'بدون اشتراك';
  return `<article class="measurement member-card"><div><b>${m.name}</b><br><small>${m.phone||'لا يوجد هاتف'} · ${label}</small><br><small>ينتهي: ${m.endDate||'—'}</small></div><div class="member-actions">${has?'<button type="button" disabled>✓ تم الدخول اليوم</button>':`<button type="button" class="primary" data-attendance-checkin="${m.id}">✓ تسجيل الدخول</button>`}</div></article>`;
 }).join(''):'<p class="muted">لا يوجد منخرط مطابق للبحث.</p>';

 const list=$('#attendanceList');
 if(list){
  todayRows.sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  list.innerHTML=todayRows.length?todayRows.map(x=>{
   const st=memberStatus(x.member);
   const warn=st==='expired'?' · ⚠️ الاشتراك منتهي':st==='soon'?' · ⚠️ قريب الانتهاء':'';
   return `<div class="measurement"><span><b>${x.member.name}</b><br><small>${x.member.phone||''}</small></span><span>🕐 ${x.time||'—'}${warn}</span></div>`;
  }).join(''):'<p class="muted">لم يتم تسجيل حضور اليوم بعد.</p>';
 }
}

document.querySelector('#attendanceMemberSearch')?.addEventListener('input',renderAttendance);
document.querySelector('#attendanceMemberList')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-attendance-checkin]');if(!b)return;
 const m=memberById(b.dataset.attendanceCheckin);if(!m)return;
 const d=today();m.attendance=memberAttendance(m);
 if(m.attendance.some(x=>x.date===d))return toast('تم تسجيل حضور هذا المنخرط اليوم مسبقاً ✓');
 const st=memberStatus(m);
 if(st==='expired')return toast('⚠️ لا يمكن تسجيل الحضور: اشتراك المنخرط منتهي');
 m.attendance.push({date:d,time:new Date().toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'})});
 saveMember(m);renderAttendance();renderMembers();
 toast(st==='soon'?'تم تسجيل الحضور ✓ الاشتراك قريب من الانتهاء':'تم تسجيل الحضور ✓');
});

document.querySelector('#paymentForm')?.addEventListener('submit',e=>{e.preventDefault();const amount=Number($('#payAmount').value);if(!amount)return toast('أدخل مبلغ الدفع');state.payments.push({amount,date:$('#payDate').value||today(),type:$('#payType').value,method:$('#payMethod').value,note:$('#payNote').value});save();e.target.reset();$('#payDate').value=today();toast('تم تسجيل الدفعة 💳');renderPayments()});
document.querySelector('#addPaymentBtn')?.addEventListener('click',()=>{nav('payments');setTimeout(()=>$('#payAmount').focus(),50)});
document.querySelector('#checkInBtn')?.addEventListener('click',()=>{const d=today();if(state.attendance.some(x=>x.date===d))return toast('تم تسجيل حضور اليوم مسبقاً');state.attendance.push({date:d});save();toast('تم تسجيل الحضور ✓');renderAttendance()});
document.querySelector('#profileForm')?.addEventListener('submit',e=>{e.preventDefault();['name','age','height','weight','level','goal','days','monthlyFee'].forEach(k=>state.profile[k]=$('#'+k).value);save();$('#saveMsg').classList.remove('hidden');toast('تم حفظ الملف بنجاح');render()});
document.querySelector('#completeWorkout')?.addEventListener('click',()=>{state.sessions++;save();toast('تم تسجيل الحصة 💪');render()});
document.querySelector('#measurementForm')?.addEventListener('submit',e=>{e.preventDefault();const w=$('#mWeight').value;if(!w)return toast('أدخل الوزن أولاً');state.measurements.push({date:new Date().toLocaleDateString('ar-DZ'),weight:w,chest:$('#mChest').value,waist:$('#mWaist').value});state.profile.weight=w;save();e.target.reset();toast('تمت إضافة القياس');render()});
document.querySelector('#exportBtn')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tigre-backup.json';a.click();URL.revokeObjectURL(a.href);toast('تم إنشاء النسخة الاحتياطية')});
document.querySelector('#importFile')?.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.profile)throw Error();state=x;save();fill();render();renderMembers();toast('تم الاسترجاع بنجاح')}catch{toast('ملف النسخة الاحتياطية غير صالح')}};r.readAsText(f)});
document.querySelector('#resetBtn')?.addEventListener('click',()=>{if(confirm('حذف جميع بيانات التطبيق من هذا الجهاز؟')){localStorage.removeItem(KEY);location.reload()}});
document.querySelector('#themeBtn')?.addEventListener('click',()=>toast('الوضع الداكن هو الوضع الأساسي في TIGRE'));
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});document.querySelector('#installBtn')?.addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));fill();render();

nav('dashboard');
