const fs = require('fs') as {
  readFileSync(path: string, encoding: string): string;
  readdirSync(path: string): string[];
  existsSync(path: string): boolean;
};
const read = (relativePath: string) => fs.readFileSync(relativePath, 'utf8');

describe('release configuration and signing safeguards', () => {
  it('never falls back to the Android debug key for release builds', () => {
    const gradle = read('android/app/build.gradle');
    const buildTypesIdx = gradle.indexOf('buildTypes');
    const buildTypesBlock = gradle.slice(buildTypesIdx);
    const releaseIdx = buildTypesBlock.indexOf('release {');
    const releaseBlock = buildTypesBlock.slice(releaseIdx, releaseIdx + 800);
    expect(releaseBlock).not.toContain('signingConfig signingConfigs.debug');
    expect(releaseBlock).toMatch(/throw new GradleException|GradleException/);
  });

  it('disables Android application backup', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).toMatch(
      /android:allowBackup="false"/,
    );
  });

  it('omits INTERNET from the release manifest', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).not.toMatch(
      /android\.permission\.INTERNET/,
    );
    expect(read('android/app/src/debug/AndroidManifest.xml')).toMatch(
      /android\.permission\.INTERNET/,
    );
  });

  it('enables release minification', () => {
    const gradle = read('android/app/build.gradle');
    expect(gradle).toMatch(/enableProguardInReleaseBuilds\s*=\s*true/);
    expect(gradle).toMatch(/shrinkResources\s+enableProguardInReleaseBuilds/);
    expect(gradle).toMatch(/proguard-android-optimize\.txt/);
  });

  it('enables Android edge-to-edge display', () => {
    expect(read('android/gradle.properties')).toMatch(
      /edgeToEdgeEnabled\s*=\s*true/,
    );
  });

  it('sets FLAG_SECURE on the Android activity', () => {
    expect(
      read(
        'android/app/src/main/java/com/letsmessageencrypt/MainActivity.kt',
      ),
    ).toMatch(/FLAG_SECURE/);
  });

  it('installs an iOS privacy overlay for app switcher snapshots', () => {
    expect(read('ios/LetsMessageEncrypt/AppDelegate.swift')).toMatch(
      /showPrivacyOverlay/,
    );
  });

  it('disallows arbitrary iOS network loads', () => {
    expect(read('ios/LetsMessageEncrypt/Info.plist')).toMatch(
      /<key>NSAllowsArbitraryLoads<\/key>\s*<false\/>/,
    );
  });

  it('does not commit Xcode distribution logs or signing metadata', () => {
    const trackedArtifacts = fs
      .readdirSync('.')
      .filter(name => /LetsMessageEncrypt \d{4}-\d{2}-\d{2}/.test(name));
    expect(trackedArtifacts).toEqual([]);
  });

  it('ignores production keystore material and Xcode export folders', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).toMatch(/keystore\.properties/);
    expect(gitignore).toMatch(/release\.keystore|\*\.keystore/);
    expect(gitignore).toMatch(/Packaging\.log/);
  });

  it('uses valid Android version identifiers', () => {
    const gradle = read('android/app/build.gradle');
    const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
    const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
    expect(versionCode).toBeGreaterThan(0);
    expect(versionName).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('registers the .lme document type on iOS and Android', () => {
    const plist = read('ios/LetsMessageEncrypt/Info.plist');
    expect(plist).toMatch(/org\.tts\.letsmessageencrypt\.lme/);
    expect(plist).toMatch(/<string>lme<\/string>/);
    expect(plist).toMatch(
      /<key>LSSupportsOpeningDocumentsInPlace<\/key>\s*<true\/>/,
    );
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toMatch(/application\/vnd\.letsmessageencrypt\.lme/);
    expect(manifest).toMatch(/pathPattern="\.\*\\\\\.lme"/);
  });

  it('documents current cryptography rather than obsolete MD5-as-primary', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/PBKDF2/i);
    expect(readme).toMatch(/SHA-256/i);
    expect(readme).not.toMatch(/AES key \| `MD5\(secret\)`/);
  });
});
