# DZ-IRON FORCE PRO
# Version 3.0.0 - SECURED PRO

import os
import sqlite3
import uuid
import hashlib
from datetime import datetime, date, timedelta

from kivy.app import App
from kivy.core.window import Window
from kivy.metrics import dp
from kivy.uix.screenmanager import ScreenManager, Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.scrollview import ScrollView
from kivy.uix.popup import Popup


APP_NAME = "DZ-IRON FORCE PRO"
APP_VERSION = "3.0.0"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "dz_iron_force.db")
LICENSE_FILE = os.path.join(BASE_DIR, "license.dat")
INSTALLATION_FILE = os.path.join(BASE_DIR, "installation.id")

SECRET_SALT = "ZIED_GYM_SECRET_ANTI_RESELL_2026_PRO"

Window.clear_color = (0.035, 0.04, 0.045, 1)


# =========================================================
# SECURITY
# =========================================================

class SecurityManager:

    @staticmethod
    def installation_id():
        if os.path.exists(INSTALLATION_FILE):
            try:
                with open(INSTALLATION_FILE, "r", encoding="utf-8") as f:
                    value = f.read().strip()
                    if value:
                        return value
            except Exception:
                pass

        raw = (
            APP_NAME
            + APP_VERSION
            + str(uuid.uuid4())
            + str(uuid.getnode())
        )

        installation_id = hashlib.sha256(
            raw.encode("utf-8")
        ).hexdigest()[:16].upper()

        with open(INSTALLATION_FILE, "w", encoding="utf-8") as f:
            f.write(installation_id)

        return installation_id

    @staticmethod
    def generate_license_key(expiry_string):
        installation_id = SecurityManager.installation_id()

        raw = (
            installation_id
            + "@"
            + expiry_string
            + "@"
            + SECRET_SALT
        )

        digest = hashlib.sha256(
            raw.encode("utf-8")
        ).hexdigest().upper()[:20]

