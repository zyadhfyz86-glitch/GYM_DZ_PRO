package com.gymdz.pro;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.speech.tts.TextToSpeech;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.SpeechService;
import android.speech.RecognitionListener;
import java.util.Locale;

public class MainActivity extends Activity {
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;
private Model voskModel;
private Recognizer voskRecognizer;
private SpeechService voskService;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF090A0C);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());

        textToSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int result = textToSpeech.setLanguage(new Locale("ar", "DZ"));
                if (result == TextToSpeech.LANG_MISSING_DATA ||
                    result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    result = textToSpeech.setLanguage(new Locale("ar"));
                }
                ttsReady = result != TextToSpeech.LANG_MISSING_DATA &&
                           result != TextToSpeech.LANG_NOT_SUPPORTED;
            }
        });

        webView.addJavascriptInterface(new AndroidTTS(), "AndroidTTS");
        webView.addJavascriptInterface(new AndroidSpeech(), "AndroidSpeech");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {

                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M
                            && checkSelfPermission(Manifest.permission.CAMERA)
                            != PackageManager.PERMISSION_GRANTED) {

                        pendingPermissionRequest = request;

                        requestPermissions(
                                new String[]{Manifest.permission.CAMERA},
                                1001
                        );

                        return;
                    }

                    request.grant(new String[]{
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE
                    });
                });
            }
        });

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M
                && checkSelfPermission(Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {

            requestPermissions(
                    new String[]{Manifest.permission.CAMERA},
                    1001
            );
        }

        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults) {

        super.onRequestPermissionsResult(
                requestCode,
                permissions,
                grantResults
        );

        if (requestCode == 1002) {
            if (grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startVoskSpeech();
            } else if (webView != null) {
                webView.evaluateJavascript(
                    "window.onNativeSpeechError && window.onNativeSpeechError('not-allowed')",
                    null
                );
            }
            return;
        }

        if (requestCode == 1001) {

            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {

                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(
                            new String[]{
                                    PermissionRequest.RESOURCE_VIDEO_CAPTURE
                            }
                    );
                    pendingPermissionRequest = null;
                }

                if (webView != null) {
                    webView.reload();
                }

            } else {

                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
            }
        }
    }

    private class AndroidTTS {
        @JavascriptInterface
        public void speak(String text) {
            runOnUiThread(() -> {
                if (textToSpeech != null && ttsReady && text != null && !text.trim().isEmpty()) {
                    textToSpeech.stop();
                    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "GYMDZ_AI");
                }
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (textToSpeech != null) {
                    textToSpeech.stop();
                }
            });
        }
    }


    private class AndroidSpeech {
        @JavascriptInterface
        public void start() {
            runOnUiThread(() -> {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M
                    && checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {

                    requestPermissions(
                        new String[]{Manifest.permission.RECORD_AUDIO},
                        1002
                    );
                    return;
                }

                startVoskSpeech();
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (voskService != null) {
                    voskService.stop();
                    voskService.shutdown();
                    voskService = null;
                }

                if (webView != null) {
                    webView.evaluateJavascript(
                        "window.onNativeSpeechEnd && window.onNativeSpeechEnd()",
                        null
                    );
                }
            });
        }
    }

    private void startVoskSpeech() {
        try {
            String modelPath =
                "/storage/emulated/0/Download/GYM-DZ-PRO/vosk-model-ar";

            java.io.File modelDir = new java.io.File(modelPath);

            if (!modelDir.exists() || !modelDir.isDirectory()) {
                android.widget.Toast.makeText(
                    this,
                    "نموذج التعرف الصوتي غير موجود",
                    android.widget.Toast.LENGTH_LONG
                ).show();

                webView.evaluateJavascript(
                    "window.onNativeSpeechError && window.onNativeSpeechError('unavailable')",
                    null
                );
                return;
            }

            if (voskService != null) {
                voskService.stop();
                voskService.shutdown();
                voskService = null;
            }

            if (voskRecognizer != null) {
                voskRecognizer.close();
                voskRecognizer = null;
            }

            if (voskModel != null) {
                voskModel.close();
                voskModel = null;
            }

            voskModel = new Model(modelPath);
            voskRecognizer = new Recognizer(voskModel, 16000.0f);
            voskService = new SpeechService(voskRecognizer, 16000.0f);

            voskService.startListening(
                new org.vosk.android.RecognitionListener() {

                    @Override
                    public void onPartialResult(String hypothesis) {
                    }

                    @Override
                    public void onResult(String hypothesis) {
                    }

                    @Override
                    public void onFinalResult(String hypothesis) {
                        try {
                            org.json.JSONObject result =
                                new org.json.JSONObject(hypothesis);

                            String text = result.optString("text", "").trim();

                            if (!text.isEmpty() && webView != null) {
                                webView.evaluateJavascript(
                                    "window.onNativeSpeechResult && window.onNativeSpeechResult("
                                    + org.json.JSONObject.quote(text)
                                    + ")",
                                    null
                                );
                            }

                            if (webView != null) {
                                webView.evaluateJavascript(
                                    "window.onNativeSpeechEnd && window.onNativeSpeechEnd()",
                                    null
                                );
                            }

                        } catch (Exception e) {
                            if (webView != null) {
                                webView.evaluateJavascript(
                                    "window.onNativeSpeechError && window.onNativeSpeechError('result-error')",
                                    null
                                );
                            }
                        }
                    }

                    @Override
                    public void onError(Exception e) {
                        if (webView != null) {
                            webView.evaluateJavascript(
                                "window.onNativeSpeechError && window.onNativeSpeechError("
                                + org.json.JSONObject.quote(
                                    e != null ? e.getMessage() : "error"
                                )
                                + ")",
                                null
                            );
                        }
                    }

                    @Override
                    public void onTimeout() {
                        if (webView != null) {
                            webView.evaluateJavascript(
                                "window.onNativeSpeechEnd && window.onNativeSpeechEnd()",
                                null
                            );
                        }
                    }
                }
            );

            if (webView != null) {
                webView.evaluateJavascript(
                    "window.onNativeSpeechStart && window.onNativeSpeechStart()",
                    null
                );
            }

        } catch (Exception e) {
            android.widget.Toast.makeText(
                this,
                "تعذر تشغيل التعرف الصوتي: " + e.getMessage(),
                android.widget.Toast.LENGTH_LONG
            ).show();

            if (webView != null) {
                webView.evaluateJavascript(
                    "window.onNativeSpeechError && window.onNativeSpeechError("
                    + org.json.JSONObject.quote(
                        e.getMessage() != null ? e.getMessage() : "error"
                    )
                    + ")",
                    null
                );
            }
        }
    }

    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        if (voskService != null) {
            voskService.stop();
            voskService.shutdown();
            voskService = null;
        }

        if (voskRecognizer != null) {
            voskRecognizer.close();
            voskRecognizer = null;
        }

        if (voskModel != null) {
            voskModel.close();
            voskModel = null;
        }

        if (webView != null) {
            webView.removeJavascriptInterface("AndroidTTS");
            webView.removeJavascriptInterface("AndroidSpeech");
        }

        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
