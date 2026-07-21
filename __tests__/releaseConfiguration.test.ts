const fs = require('fs') as {
  readFileSync(path: string, encoding: string): string;
  readdirSync(path: string): string[];
};
const read = (relativePath: string) => fs.readFileSync(relativePath, 'utf8');

describe('release configuration and signing safeguards', () => {
  it.failing(
    'never falls back to the Android debug key for release builds',
    () => {
      const gradle = read('android/app/build.gradle');
      const releaseBlock = gradle.slice(gradle.indexOf('release {'));
      expect(releaseBlock).not.toContain('signingConfig signingConfigs.debug');
      expect(releaseBlock).toMatch(/throw new GradleException|GradleException/);
    },
  );

  it('disables Android application backup', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).toMatch(
      /android:allowBackup="false"/,
    );
  });

  it('disallows arbitrary iOS network loads', () => {
    expect(read('ios/LetsMessageEncrypt/Info.plist')).toMatch(
      /<key>NSAllowsArbitraryLoads<\/key>\s*<false\/>/,
    );
  });

  it.failing(
    'does not commit Xcode distribution logs or signing metadata',
    () => {
      const trackedArtifacts = fs
        .readdirSync('.')
        .filter(name => /LetsMessageEncrypt \d{4}-\d{2}-\d{2}/.test(name));
      expect(trackedArtifacts).toEqual([]);
    },
  );

  it('ignores production keystore material', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).toMatch(/keystore\.properties/);
    expect(gitignore).toMatch(/release\.keystore|\*\.keystore/);
  });

  it('uses valid Android version identifiers', () => {
    const gradle = read('android/app/build.gradle');
    const versionCode = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
    const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
    expect(versionCode).toBeGreaterThan(0);
    expect(versionName).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
