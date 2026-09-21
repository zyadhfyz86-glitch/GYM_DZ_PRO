import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://127.0.0';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Splash'); 
  const [statusMessage, setStatusMessage] = useState('جاري تهيئة النظام...');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (currentScreen === 'Splash') {
      checkServerAndSession();
    }
  }, [currentScreen]);

  const checkServerAndSession = async () => {
    try {
      setStatusMessage('جاري الاتصال بالسيرفر المحترِف...');
      const response = await fetch(`${API_BASE_URL}/health-check`).catch(() => null);
      if (!response || response.status !== 200) {
        throw new Error('لم يتم العثور على السيرفر شغالاً في Termux. تأكد من تشغيل أمر (node server.js) أولاً!');
      }
      setStatusMessage('جاري التحقق من الجلسة السابقة...');
      const savedToken = await AsyncStorage.getItem('userToken');
      if (savedToken) {
        fetchMembers();
        setCurrentScreen('Home');
      } else {
        setCurrentScreen('Login');
      }
    } catch (error) {
      Alert.alert('تنبيه النظام', error.message, [
        { text: 'إعادة المحاولة', onPress: () => checkServerAndSession() }
      ]);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      if (response.status === 200 && result.success) {
        await AsyncStorage.setItem('userToken', result.token);
        fetchMembers();
        setCurrentScreen('Home');
      } else {
        Alert.alert('فشل الدخول', result.error || 'خطأ غير معروف');
      }
    } catch (error) {
      Alert.alert('خطأ', 'تعذر الاتصال بالسيرفر، تأكد أنه شغال في الخلفية.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/members`);
      const result = await response.json();
      if (result.success) {
        setMembers(result.data);
      }
    } catch (error) {
      console.log('خطأ في جلب الأعضاء:', error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    setUsername('');
    setPassword('');
    setCurrentScreen('Login');
  };

  if (currentScreen === 'Splash') {
    return (
      <View style={[styles.container, { justifyContent: 'space-between', paddingVertical: 60 }]}>
        <View style={styles.centerBox}>
          <Text style={styles.mainTitle}>DZ-IRON FORCE PRO</Text>
          <Text style={styles.subtitle}>نظام إدارة الصالة الرياضية</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      </View>
    );
  }

  if (currentScreen === 'Login') {
    return (
      <View style={styles.container}>
        <Text style={styles.screenTitle}>تسجيل الدخول للمشرف</Text>
        <TextInput 
          style={styles.input} 
          placeholder="اسم المستخدم" 
          placeholderTextColor="#666"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="كلمة المرور" 
          placeholderTextColor="#666" 
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>دخول النظام</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (currentScreen === 'Home') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>لوحة التحكم الرئيسية 🏋️‍♂️</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>قائمة المشتركين الحالية:</Text>
        <ScrollView style={styles.memberList}>
          {members.length === 0 ? (
            <Text style={styles.noMembers}>لا يوجد مشتركين مسجلين حالياً في قاعدة البيانات.</Text>
          ) : (
            members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberDetail}>الاشتراك: {member.plan_type} | ينتهي: {member.expiry_date}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 24, justifyContent: 'center' },
  centerBox: { alignItems: 'center' },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#FFD700', textAlign: 'center' },
  statusText: { color: '#888', marginTop: 15, fontSize: 14 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#1E1E1E', color: '#FFF', padding: 15, borderRadius: 8, marginBottom: 16, textAlign: 'right', fontSize: 16 },
  button: { backgroundColor: '#FFD700', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  welcomeText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#FF3B30', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  logoutText: { color: '#FFF', fontWeight: 'bold' },
  sectionTitle: { color: '#FFD700', fontSize: 18, marginBottom: 15, textAlign: 'right' },
  memberList: { flex: 1 },
  noMembers: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
  memberCard: { backgroundColor: '#1E1E1E', padding: 15, borderRadius: 8, marginBottom: 10, borderRightWidth: 4, borderRightColor: '#FFD700' },
  memberName: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  memberDetail: { color: '#AAA', fontSize: 14, textAlign: 'right', marginTop: 5 }
});
