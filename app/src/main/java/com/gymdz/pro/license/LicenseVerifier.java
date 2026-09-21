package com.gymdz.pro.license;

import android.content.Context;
import android.content.SharedPreferences;

public final class LicenseVerifier {
    private static final String VALID_KEY = "GYM-DZ-PRO-2026";
    private static final String PREFS = "gymdz_license";
    private static final String ACTIVE = "active";

    private LicenseVerifier() {}

    public static boolean verify(Context context, String licenseKey) {
        if (licenseKey == null) return false;

        String key = licenseKey.trim()
                .replace("\n", "")
                .replace("\r", "")
                .replace(" ", "");

        if (!VALID_KEY.equalsIgnoreCase(key)) return false;

        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(ACTIVE, true)
                .apply();

        return true;
    }

    public static boolean isActivated(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean(ACTIVE, false);
    }
}
