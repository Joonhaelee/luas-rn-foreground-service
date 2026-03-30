package space.luas.rnforegroundservice;

import androidx.annotation.NonNull;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

/**
 * React Native package for Foreground Service TurboModule
 *
 * This package registers the ForegroundServiceModule with React Native.
 * Extends TurboReactPackage for TurboModule support.
 */
public class RNForegroundServicePackage extends BaseReactPackage {

    @Nullable
    @Override
    public NativeModule getModule(String name, @Nonnull ReactApplicationContext reactContext) {
        if (name.equals(RNForegroundServiceModule.NAME)) {
            return new RNForegroundServiceModule(reactContext);
        }
        return null;
    }

    @NonNull
    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return new ReactModuleInfoProvider() {
            @NonNull
            @Override
            public Map<String, ReactModuleInfo> getReactModuleInfos() {
                Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
                moduleInfos.put(RNForegroundServiceModule.NAME,
                    new ReactModuleInfo(
                        RNForegroundServiceModule.NAME,       // name
                        RNForegroundServiceModule.class.getName(),  // className
                        false, // canOverrideExistingModule
                        true, // needsEagerInit
                        false, // isCXXModule
                        true   // isTurboModule
                    )
                );
                return moduleInfos;
            }
        };
    }
}
