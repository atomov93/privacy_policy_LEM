import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import {EU_LANGUAGE_CODES, resolveDeviceLanguage} from './languages';
import bg from './locales/bg.json';
import cs from './locales/cs.json';
import da from './locales/da.json';
import de from './locales/de.json';
import el from './locales/el.json';
import en from './locales/en.json';
import es from './locales/es.json';
import et from './locales/et.json';
import fi from './locales/fi.json';
import fr from './locales/fr.json';
import ga from './locales/ga.json';
import hr from './locales/hr.json';
import hu from './locales/hu.json';
import it from './locales/it.json';
import lt from './locales/lt.json';
import lv from './locales/lv.json';
import mt from './locales/mt.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import sk from './locales/sk.json';
import sl from './locales/sl.json';
import sv from './locales/sv.json';

const resources = {
  bg: {translation: bg},
  cs: {translation: cs},
  da: {translation: da},
  de: {translation: de},
  el: {translation: el},
  en: {translation: en},
  es: {translation: es},
  et: {translation: et},
  fi: {translation: fi},
  fr: {translation: fr},
  ga: {translation: ga},
  hr: {translation: hr},
  hu: {translation: hu},
  it: {translation: it},
  lt: {translation: lt},
  lv: {translation: lv},
  mt: {translation: mt},
  nl: {translation: nl},
  pl: {translation: pl},
  pt: {translation: pt},
  ro: {translation: ro},
  sk: {translation: sk},
  sl: {translation: sl},
  sv: {translation: sv},
};

let initPromise: Promise<void> | null = null;

export async function initI18n(savedLanguage?: string | null): Promise<void> {
  if (i18n.isInitialized) {
    if (savedLanguage && EU_LANGUAGE_CODES.includes(savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
    }
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const deviceLocale = RNLocalize.getLocales()[0]?.languageCode;
    const initialLanguage = savedLanguage
      ? resolveDeviceLanguage(savedLanguage)
      : resolveDeviceLanguage(deviceLocale);

    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      supportedLngs: EU_LANGUAGE_CODES,
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  })();

  return initPromise;
}

export async function changeAppLanguage(languageCode: string): Promise<void> {
  if (EU_LANGUAGE_CODES.includes(languageCode)) {
    await i18n.changeLanguage(languageCode);
  }
}

export default i18n;
