export interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
}

/** All 24 official EU languages, sorted by native name. */
export const EU_LANGUAGES: LanguageOption[] = [
  {code: 'bg', nativeName: 'Български', englishName: 'Bulgarian'},
  {code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian'},
  {code: 'cs', nativeName: 'Čeština', englishName: 'Czech'},
  {code: 'da', nativeName: 'Dansk', englishName: 'Danish'},
  {code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch'},
  {code: 'en', nativeName: 'English', englishName: 'English'},
  {code: 'et', nativeName: 'Eesti', englishName: 'Estonian'},
  {code: 'fi', nativeName: 'Suomi', englishName: 'Finnish'},
  {code: 'fr', nativeName: 'Français', englishName: 'French'},
  {code: 'de', nativeName: 'Deutsch', englishName: 'German'},
  {code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek'},
  {code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian'},
  {code: 'ga', nativeName: 'Gaeilge', englishName: 'Irish'},
  {code: 'it', nativeName: 'Italiano', englishName: 'Italian'},
  {code: 'lv', nativeName: 'Latviešu', englishName: 'Latvian'},
  {code: 'lt', nativeName: 'Lietuvių', englishName: 'Lithuanian'},
  {code: 'mt', nativeName: 'Malti', englishName: 'Maltese'},
  {code: 'pl', nativeName: 'Polski', englishName: 'Polish'},
  {code: 'pt', nativeName: 'Português', englishName: 'Portuguese'},
  {code: 'ro', nativeName: 'Română', englishName: 'Romanian'},
  {code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak'},
  {code: 'sl', nativeName: 'Slovenščina', englishName: 'Slovenian'},
  {code: 'es', nativeName: 'Español', englishName: 'Spanish'},
  {code: 'sv', nativeName: 'Svenska', englishName: 'Swedish'},
];

export const EU_LANGUAGE_CODES = EU_LANGUAGES.map(l => l.code);

export function getLanguageNativeName(code: string): string {
  return EU_LANGUAGES.find(l => l.code === code)?.nativeName ?? code;
}

export function resolveDeviceLanguage(
  deviceLanguageCode: string | undefined,
): string {
  if (!deviceLanguageCode) {
    return 'en';
  }
  const base = deviceLanguageCode.split('-')[0].toLowerCase();
  return EU_LANGUAGE_CODES.includes(base) ? base : 'en';
}
