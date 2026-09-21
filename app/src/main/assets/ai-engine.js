(function(){
"use strict";

const N=v=>{
 const x=Number(v);
 return Number.isFinite(x)?x:0;
};

const TODAY=()=>new Date().toISOString().slice(0,10);

function daysUntil(date){
 if(!date)return null;
 const a=new Date();
 a.setHours(0,0,0,0);
 const b=new Date(date+"T00:00:00");
 return Math.ceil((b-a)/86400000);
}

function memberStatus(m){
 const d=daysUntil(m&&m.endDate);
 if(d===null)return"none";
 if(d<0)return"expired";
 if(d<=7)return"soon";
 return"active";
}

function money(v){
 return N(v).toLocaleString("ar-DZ")+" دج";
}

function analyze(state,members){
 state=state||{};
 const p=state.profile||{};
 const measurements=Array.isArray(state.measurements)?state.measurements:[];
 const payments=Array.isArray(state.payments)?state.payments:[];
 const mem=Array.isArray(members)?members:[];
 const ym=TODAY().slice(0,7);

 const income=payments
  .filter(x=>(x.date||"").slice(0,7)===ym)
  .reduce((s,x)=>s+N(x.amount),0);

 const active=mem.filter(x=>memberStatus(x)==="active");
 const soon=mem.filter(x=>memberStatus(x)==="soon");
 const expired=mem.filter(x=>memberStatus(x)==="expired");

 let trend="لا توجد قياسات كافية";

 if(measurements.length>=2){
  const a=N(measurements[measurements.length-2].weight);
  const b=N(measurements[measurements.length-1].weight);

  if(a&&b){
   if(b>a)trend="الوزن في ارتفاع";
   else if(b<a)trend="الوزن في انخفاض";
   else trend="الوزن ثابت";
  }
 }

 const weight=N(p.weight);
 let calories=null;

 if(weight){
  if(p.goal==="cut")calories=Math.round(weight*28);
  else if(p.goal==="muscle")calories=Math.round(weight*33);
  else calories=Math.round(weight*30);
 }

 const tips=[];

 if(!p.name||!weight)
  tips.push("أكمل الملف الرياضي حتى تصبح التوصيات أدق.");

 if(trend==="الوزن في انخفاض"&&p.goal==="muscle")
  tips.push("هدفك بناء العضلات والوزن ينخفض؛ راقب التغذية والتعافي.");

 if(trend==="الوزن في ارتفاع"&&p.goal==="cut")
  tips.push("هدفك التنشيف والوزن يرتفع؛ راقب متوسط الوزن والتغذية.");

 if(soon.length)
  tips.push("يوجد "+soon.length+" اشتراك قريب من الانتهاء.");

 if(expired.length)
  tips.push("يوجد "+expired.length+" اشتراك منتهٍ يحتاج متابعة.");

 if(!tips.length)
  tips.push("بياناتك مرتبة. استمر في تسجيل التمارين والقياسات بانتظام.");

 return{
  training:{sessions:N(state.sessions),trend},
  nutrition:{
   calories,
   protein:weight?Math.round(weight*1.8):null
  },
  gym:{
   total:mem.length,
   active:active.length,
   soon:soon.length,
   expired:expired.length,
   income
  },
  tips
 };
}

function answer(question,state,members){
 const q=(question||"").trim().toLowerCase();
 state=state||{};
 const mem=Array.isArray(members)?members:[];
 const p=state.profile||{};

 if(!q)return"اكتب سؤالك وسأحلل بيانات GYM DZ PRO.";

 if(/اشتراك|ينته|انته/.test(q)){
  const soon=mem.filter(x=>memberStatus(x)==="soon");
  const expired=mem.filter(x=>memberStatus(x)==="expired");

  if(/هذا الأسبوع|قريب/.test(q)){
   if(!soon.length)return"لا يوجد اشتراك ينتهي خلال 7 أيام.";

   return"الاشتراكات القريبة من الانتهاء:\n"+
    soon.map(x=>"• "+(x.name||"بدون اسم")+" — "+(x.endDate||"—")).join("\n");
  }

  if(expired.length)
   return"الاشتراكات المنتهية:\n"+
    expired.map(x=>"• "+(x.name||"بدون اسم")).join("\n");

  return"لا توجد اشتراكات منتهية حالياً.";
 }

 if(/دخل|مداخيل|إيراد/.test(q)){
  const ym=TODAY().slice(0,7);

  const total=(state.payments||[])
   .filter(x=>(x.date||"").slice(0,7)===ym)
   .reduce((s,x)=>s+N(x.amount),0);

  return"إجمالي المدفوعات المسجلة هذا الشهر: "+
   money(total)+
   ".\nهذا إجمالي المدفوعات المسجلة وليس الربح الصافي.";
 }

 if(/حضور|بونتاج|دخول/.test(q)){
  const d=TODAY();
  let count=0;

  mem.forEach(m=>{
   if((m.attendance||[]).some(x=>x.date===d))count++;
  });

  return"الحاضرون المسجلون اليوم: "+
   count+" من "+mem.length+" منخرط.";
 }

 if(/وزن|تقدم|تطور/.test(q)){
  const ms=state.measurements||[];

  if(ms.length<2)
   return"أحتاج قياسين على الأقل لتحليل تطور الوزن.";

  const a=N(ms[ms.length-2].weight);
  const b=N(ms[ms.length-1].weight);

  return"آخر قياسين: "+a+" كغ ثم "+b+
   " كغ.\nالتغير: "+(b-a>0?"+":"")+
   (b-a).toFixed(1)+" كغ.";
 }

 if(/سعرات|بروتين|غذاء|تغذي/.test(q)){
  const w=N(p.weight);

  if(!w)return"أدخل الوزن والهدف في الملف أولاً.";

  const c=p.goal==="cut"?w*28:
          p.goal==="muscle"?w*33:
          w*30;

  return"تقدير أولي: حوالي "+
   Math.round(c)+" سعرة/اليوم و "+
   Math.round(w*1.8)+
   " غ بروتين/اليوم.\nهذه أرقام عامة وليست وصفة طبية.";
 }

 return"أستطيع حالياً تحليل الاشتراكات والحضور والمدفوعات والوزن والتقدم والتغذية.";
}

window.GymAI={
 analyze,
 answer
};

})();
