package com.luasrnforegroundservice

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class LuasRnForegroundServicePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == LuasRnForegroundServiceModule.NAME) {
      LuasRnForegroundServiceModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      LuasRnForegroundServiceModule.NAME to ReactModuleInfo(
        name = LuasRnForegroundServiceModule.NAME,
        className = LuasRnForegroundServiceModule.NAME,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        isCxxModule = false,
        isTurboModule = true
      )
    )
  }
}
