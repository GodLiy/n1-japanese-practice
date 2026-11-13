package com.godliy.chowa;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Asks for the microphone before the WebView opens a capture stream. */
@CapacitorPlugin(
    name = "ChowaMic",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") }
)
public class ChowaMicPlugin extends Plugin {
    @PluginMethod
    public void request(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            resolve(call, true);
            return;
        }
        requestPermissionForAlias("microphone", call, "micCallback");
    }

    @PermissionCallback
    private void micCallback(PluginCall call) {
        resolve(call, getPermissionState("microphone") == PermissionState.GRANTED);
    }

    private void resolve(PluginCall call, boolean granted) {
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }
}
