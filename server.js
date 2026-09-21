const express = require('express');
const cors = require('cors');
const Datastore = require('nedb-promises');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// إنشاء قواعد البيانات كملفات نصية ذكية داخل المجلد محلياً في Termux
const dbAdmins = Datastore.create({ filename: path.join(__dirname, 'admins.db'), autoload: true });
const dbMembers = Datastore.create({ filename: path.join(__dirname, 'members.db'), autoload: true });

// إنشاء حساب المشرف الافتراضي تلقائياً عند أول تشغيل
async function initDatabase() {
  const count = await dbAdmins.count({});
  if (count === 0) {
    await dbAdmins.insert({ username: 'admin', password: 'admin123' });
    console.log("🟢 تم إنشاء حساب المشرف الافتراضي في NeDB: admin / admin123");
  }
  console.log("🟢 قاعدة بيانات NeDB الاحترافية جاهزة وشغالة بنجاح!");
}
initDatabase();

// 1. ميزة فحص الاتصال الذكي (Health Check)
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'السيرفر متصل وشغال بنجاح في Termux!' });
});

// 2. ميزة تسجيل الدخول والتحقق من الحساب
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await dbAdmins.findOne({ username, password });

    if (admin) {
      res.json({ success: true, token: "SECRET_GYM_TOKEN_12345", message: "تم تسجيل الدخول بنجاح" });
    } else {
      res.status(401).json({ success: false, error: "اسم المستخدم أو كلمة المرور خاطئة!" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: "خطأ في الخادم الداخلي" });
  }
});

// 3. ميزة جلب قائمة أعضاء الصالة الرياضية
app.get('/api/members', async (req, res) => {
  try {
    const rows = await dbMembers.find({});
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تشغيل السيرفر
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 السيرفر الاحترافي شغال الآن على الرابط: http://127.0.0.1:${PORT}`);
});

