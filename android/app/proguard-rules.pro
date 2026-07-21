# Keep React Native + crypto native modules.
-keep class com.facebook.react.** { *; }
-keep class com.swmansion.** { *; }
-keep class com.oblador.keychain.** { *; }
-keep class com.RNKeychain.** { *; }
-dontwarn com.oblador.keychain.**

# CryptoJS / Hermes
-keepclassmembers class * {
  @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}
