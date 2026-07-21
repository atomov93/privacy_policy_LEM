import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private var privacyOverlay: UIView?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "LetsMessageEncrypt",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func applicationWillResignActive(_ application: UIApplication) {
    showPrivacyOverlay()
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
    hidePrivacyOverlay()
  }

  func applicationDidEnterBackground(_ application: UIApplication) {
    showPrivacyOverlay()
  }

  private func showPrivacyOverlay() {
    guard let window = self.window, privacyOverlay == nil else { return }
    let overlay = UIView(frame: window.bounds)
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlay.backgroundColor = UIColor.systemBackground
    let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
    blur.frame = overlay.bounds
    blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlay.addSubview(blur)
    window.addSubview(overlay)
    privacyOverlay = overlay
  }

  private func hidePrivacyOverlay() {
    privacyOverlay?.removeFromSuperview()
    privacyOverlay = nil
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
