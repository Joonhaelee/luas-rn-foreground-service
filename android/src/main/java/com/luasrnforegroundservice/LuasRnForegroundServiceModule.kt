package com.luasrnforegroundservice

import com.facebook.react.bridge.ReactApplicationContext

class LuasRnForegroundServiceModule(reactContext: ReactApplicationContext) :
  NativeLuasRnForegroundServiceSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeLuasRnForegroundServiceSpec.NAME
  }
}
