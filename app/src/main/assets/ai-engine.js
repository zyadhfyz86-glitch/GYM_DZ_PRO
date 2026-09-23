
// جسر الربط المباشر مع الذكاء الاصطناعي للهاتف (GymAI)
window.runGymAIInference = function(featuresArray) {
    if (typeof GymAI !== 'undefined' && GymAI.predict) {
        try {
            // تحويل المدخلات إلى مصفوفة أرقام عشرية Float32
            const floatFeatures = new Float32Array(featuresArray.map(v => Number(v) || 0));
            // استدعاء الموديل عبر الجافا
            const resultJson = GymAI.predict(Array.from(floatFeatures));
            if (resultJson) {
                return JSON.parse(resultJson);
            }
        } catch (e) {
            console.error("خطأ أثناء تشغيل موديل ONNX:", e);
        }
    } else {
        console.warn("تنبيه: محرك الذكاء الاصطناعي يعمل في وضع المحاكاة الافتراضية.");
    }
    // نتائج افتراضية حمايةً للتطبيق من التوقف في حال عدم التثبيت التام
    return [0.5, 0.3, 0.2]; 
};

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

function memberName(m){
 return m&&m.name?m.name:"بدون اسم";
}

function normalize(q){
 return (q||"")
  .toLowerCase()
  .replace(/[إأآ]/g,"ا")
  .replace(/ة/g,"ه")
  .replace(/ى/g,"ي")
  .replace(/[؟?!.،,:;]/g," ")
  .replace(/\s+/g," ")
  .trim();
}

function analyze(state,members){
 state=state||{};
 const p=state.profile||{};
 const measurements=Array.isArray(state.measurements)?state.measurements:[];
 const payments=Array.isArray(state.payments)?state.payments:[];
 const mem=Array.isArray(members)?members:[];

 const ym=TODAY().slice(0,7);
 const today=TODAY();

 const income=payments
  .filter(x=>(x.date||"").slice(0,7)===ym)
  .reduce((sum,x)=>sum+N(x.amount),0);

 const active=mem.filter(x=>memberStatus(x)==="active");
 const soon=mem.filter(x=>memberStatus(x)==="soon");
 const expired=mem.filter(x=>memberStatus(x)==="expired");

 const presentToday=mem.filter(m=>
  Array.isArray(m.attendance)&&m.attendance.some(x=>x.date===today)
 );

 const absentToday=mem.filter(m=>
  !Array.isArray(m.attendance)||!m.attendance.some(x=>x.date===today)
 );

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
 const alerts=[];

 if(expired.length){
  alerts.push("🚨 "+expired.length+" اشتراك منتهٍ يحتاج متابعة.");
  tips.push("ابدأ بمتابعة الأعضاء أصحاب الاشتراكات المنتهية.");
 }

 if(soon.length){
  alerts.push("⏰ "+soon.length+" اشتراك ينتهي خلال 7 أيام.");
  tips.push("تواصل مع أصحاب الاشتراكات القريبة من الانتهاء لتذكيرهم بالتجديد.");
 }

 if(mem.length && absentToday.length===mem.length){
  alerts.push("📅 لا يوجد حضور مسجل اليوم.");
 }else if(absentToday.length){
  alerts.push("👤 "+absentToday.length+" عضو بدون حضور مسجل اليوم.");
 }

 if(!p.name||!weight)
  tips.push("أكمل الملف الرياضي حتى تصبح التوصيات الشخصية أدق.");

 if(trend==="الوزن في انخفاض"&&p.goal==="muscle")
  tips.push("هدف بناء العضلات والوزن ينخفض؛ راقب التغذية والتعافي.");

 if(trend==="الوزن في ارتفاع"&&p.goal==="cut")
  tips.push("هدف التنشيف والوزن يرتفع؛ راقب متوسط الوزن والتغذية.");

 if(!tips.length)
  tips.push("بيانات النادي تبدو مستقرة. استمر في تسجيل الحضور والمدفوعات والقياسات.");

 const priority=alerts.length
  ? alerts.slice(0,3)
  : ["✅ لا توجد تنبيهات عاجلة حالياً."];

 return{
  training:{
   sessions:N(state.sessions),
   trend
  },
  nutrition:{
   calories,
   protein:weight?Math.round(weight*1.8):null
  },
  gym:{
   total:mem.length,
   active:active.length,
   soon:soon.length,
   expired:expired.length,
   income,
   presentToday:presentToday.length,
   absentToday:absentToday.length
  },
  alerts,
  priority,
  tips
 };
}
function answer(question,state,members){
 const q=normalize(question);
 state=state||{};
 const mem=Array.isArray(members)?members:[];
 const payments=Array.isArray(state.payments)?state.payments:[];
 const p=state.profile||{};

 if(!q)return"اكتب سؤالك وسأحلل بيانات TIGRE.";

 const wantsSoon=/هذا الاسبوع|هاذ الاسبوع|هذا السيمانه|هاذ السيمانه|قريب|قريبين|قرب/.test(q);
 const wantsExpired=/منتهي|منتهيه|خلص|خلاص|منتهون/.test(q);
 const wantsActive=/نشط|ساري|فعال/.test(q);
 const wantsAll=/كل|جميع|كامل|كاملين|الاعضاء|المنخرطين/.test(q);

 if(/اسماء المنخرطين|اسماء الاعضاء|اسماء المشتركين|قائمة المنخرطين|قائمه المنخرطين|قائمة الاعضاء|قائمه الاعضاء|اعطيني اسماء|اعطيني قائمة|شكون الاعضاء|شكون المنخرطين|شكون مسجل|الاعضاء المسجلين|المنخرطين المسجلين/.test(q)){
  if(!mem.length)return"ما كاش أعضاء مسجلين حالياً.";
  return"أسماء المنخرطين المسجلين حالياً ("+mem.length+"):\n"+
   mem.map((x,i)=>(i+1)+". "+memberName(x)).join("\n");
 }

 if(/اشتراك|اشتراكات|ينتهي|ينتهى|ينتهي|تجديد|renouvel/.test(q)){
  const soon=mem.filter(x=>memberStatus(x)==="soon");
  const expired=mem.filter(x=>memberStatus(x)==="expired");
  const active=mem.filter(x=>memberStatus(x)==="active");

  if(wantsSoon){
   if(!soon.length)return"ما كاش اشتراك ينتهي خلال 7 أيام.";
   return"الاشتراكات القريبة من الانتهاء:\n"+
    soon.map(x=>{
     const d=daysUntil(x.endDate);
     return"• "+memberName(x)+" — "+(x.endDate||"—")+
      (d===0?" — ينتهي اليوم":d===1?" — غداً":" — بعد "+d+" أيام");
    }).join("\n");
  }

  if(wantsExpired){
   if(!expired.length)return"ما كاش اشتراك منتهي حالياً.";
   return"الاشتراكات المنتهية:\n"+
    expired.map(x=>"• "+memberName(x)+" — "+(x.endDate||"—")).join("\n");
  }

  if(wantsActive){
   if(!active.length)return"ما كاش أعضاء باشتراك ساري حالياً.";
   return"الأعضاء أصحاب الاشتراك الساري: "+active.length+"\n"+
    active.map(x=>"• "+memberName(x)+" — "+(x.endDate||"—")).join("\n");
  }

  return"ملخص الاشتراكات:\n"+
   "• السارية: "+active.length+"\n"+
   "• القريبة من الانتهاء: "+soon.length+"\n"+
   "• المنتهية: "+expired.length;
 }

 if(/حضور|حاضرين|الحاضرين|بونتاج|دخول|دخلوا|حضر/.test(q)){
  const d=TODAY();
  const present=mem.filter(m=>
   Array.isArray(m.attendance)&&m.attendance.some(x=>x.date===d)
  );
  const absent=mem.filter(m=>
   !Array.isArray(m.attendance)||!m.attendance.some(x=>x.date===d)
  );

  if(/غايب|غائب|ماجاش|ماجوش|غياب/.test(q)){
   if(!absent.length)return"كل الأعضاء عندهم حضور مسجل اليوم.";
   return"الأعضاء الذين لا يوجد لهم حضور مسجل اليوم:\n"+
    absent.map(x=>"• "+memberName(x)).join("\n");
  }

  return"الحضور اليوم:\n"+
   "• الحاضرون: "+present.length+"\n"+
   "• بدون حضور مسجل: "+absent.length+"\n"+
   "• المجموع: "+mem.length;
 }

 if(/دخل|مداخيل|ايراد|ايرادات|مدفوعات|دفعات|خلصو|خلص|المداخيل|المدخول/.test(q)){
  const ym=TODAY().slice(0,7);
  const monthPayments=payments.filter(x=>(x.date||"").slice(0,7)===ym);
  const total=monthPayments.reduce((s,x)=>s+N(x.amount),0);

  if(/اليوم/.test(q)){
   const d=TODAY();
   const todayPayments=payments.filter(x=>x.date===d);
   const todayTotal=todayPayments.reduce((s,x)=>s+N(x.amount),0);
   return"مدفوعات اليوم: "+money(todayTotal)+
    "\nعدد العمليات: "+todayPayments.length;
  }

  return"المدفوعات المسجلة هذا الشهر: "+money(total)+
   "\nعدد العمليات: "+monthPayments.length+
   "\nملاحظة: هذا مجموع المدفوعات المسجلة، وليس بالضرورة الربح الصافي.";
 }

 if(/حاله النادي|حالة النادي|ملخص النادي|احوال النادي|النادي اليوم|القاعة اليوم|ملخص/.test(q)){
  const a=analyze(state,mem);
  return"حالة TIGRE:\n"+
   "• مجموع الأعضاء: "+a.gym.total+"\n"+
   "• الاشتراكات السارية: "+a.gym.active+"\n"+
   "• القريبة من الانتهاء: "+a.gym.soon+"\n"+
   "• المنتهية: "+a.gym.expired+"\n"+
   "• مداخيل الشهر: "+money(a.gym.income)+"\n"+
   "• اتجاه الوزن: "+a.training.trend;
 }

 if(/وزن|اوزان|تقدم|تطور|بروغريس|progress/.test(q)){
  const ms=Array.isArray(state.measurements)?state.measurements:[];
  if(ms.length<2)return"أحتاج قياسين على الأقل لتحليل تطور الوزن.";

  const a=N(ms[ms.length-2].weight);
  const b=N(ms[ms.length-1].weight);
  const diff=b-a;

  return"تحليل الوزن:\n"+
   "• القياس السابق: "+a+" كغ\n"+
   "• آخر قياس: "+b+" كغ\n"+
   "• التغير: "+(diff>0?"+":"")+diff.toFixed(1)+" كغ\n"+
   "• الاتجاه: "+(diff>0?"ارتفاع":diff<0?"انخفاض":"ثبات");
 }

 if(/سعرات|بروتين|غذاء|تغذيه|تغذية|اكل|أكل|ما ناكل|واش ناكل/.test(q)){
  const w=N(p.weight);
  if(!w)return"أدخل الوزن والهدف في الملف الرياضي أولاً.";

  const c=p.goal==="cut"?w*28:p.goal==="muscle"?w*33:w*30;

  return"تقدير أولي:\n"+
   "• السعرات: حوالي "+Math.round(c)+" سعرة/اليوم\n"+
   "• البروتين: حوالي "+Math.round(w*1.8)+" غ/اليوم\n"+
   "هذه أرقام عامة وليست وصفة طبية.";
 }

 if(/كم|عدد|شحال|شحال كاين|قداش/.test(q)&&/عضو|اعضاء|منخرط|منخرطين/.test(q)){
  return"عدد الأعضاء المسجلين حالياً: "+mem.length;
 }

 if(/توصي|نصيحه|نصيحة|اقتراح|شنو ندير|واش ندير|ماذا افعل/.test(q)){
  const a=analyze(state,mem);
  return"توصياتي الحالية:\n"+
   a.tips.map(x=>"• "+x).join("\n");
 }

 if(/مساعدة|ساعدني|شنو تقدر|واش تقدر|ماذا تستطيع/.test(q)){
  return"أقدر نحلل لك:\n"+
   "• الاشتراكات والتجديد\n"+
   "• الحضور والغياب\n"+
   "• المدفوعات والمداخيل\n"+
   "• الوزن والتقدم\n"+
   "• التغذية والسعرات والبروتين\n"+
   "• حالة النادي والتوصيات";
 }

 return"فهمت سؤالك، لكن مازال ما عنديش قاعدة مناسبة له.\n"+
  "جرّب مثلاً:\n"+
  "• شكون اشتراكه يخلص هذا الأسبوع؟\n"+
  "• شكون غايب اليوم؟\n"+
  "• شحال مداخيل هذا الشهر؟\n"+
  "• شحال عدد الأعضاء؟\n"+
  "• أعطيني حالة النادي\n"+
  "• حلل التقدم في الوزن";
}

window.GymAI={
 analyze,
 answer
};

})();
