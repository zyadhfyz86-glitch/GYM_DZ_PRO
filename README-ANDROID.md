# GYM DZ PRO Android

نسخة Android Offline تعتمد على WebView وتحتوي واجهة GYM DZ PRO داخل assets.

## البناء على Termux
من داخل مجلد المشروع:

    gradle assembleDebug

إذا ظهر أن Android SDK غير موجود، يجب ضبط ANDROID_HOME إلى مسار Android SDK الموجود على جهازك.

APK الناتج:
app/build/outputs/apk/debug/app-debug.apk
