package com.godliy.chowa;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ChowaMicPlugin.class);
        super.onCreate(savedInstanceState);
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) return;
        bridge.getWebView().setWebChromeClient(new SafeChrome(bridge));
    }

    /**
     * The stock client starts another permission dialog while the WebView is already
     * inside getUserMedia. On some phones that kills the app the first time.
     * This client only grants a capture that the activity has already allowed.
     */
    private static final class SafeChrome extends BridgeWebChromeClient {
        private final Bridge bridge;

        SafeChrome(Bridge bridge) {
            super(bridge);
            this.bridge = bridge;
        }

        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            boolean audio = false;
            String[] resources = request.getResources();
            if (resources != null) {
                for (String resource : resources) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) audio = true;
                }
            }
            WebView webView = bridge.getWebView();
            if (!audio || webView == null || bridge.getActivity() == null || bridge.getActivity().isFinishing()) {
                deny(request);
                return;
            }
            boolean granted =
                ContextCompat.checkSelfPermission(bridge.getActivity(), Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED;
            webView.post(() -> {
                try {
                    if (bridge.getActivity() == null || bridge.getActivity().isFinishing()) {
                        deny(request);
                        return;
                    }
                    if (granted) request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                    else deny(request);
                } catch (RuntimeException ignored) {
                    deny(request);
                }
            });
        }

        private void deny(PermissionRequest request) {
            try {
                request.deny();
            } catch (RuntimeException ignored) {
                /* the page already moved on */
            }
        }
    }
}
