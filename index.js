/**
 * @format
 */

import 'react-native-get-random-values';
import {install as installQuickCrypto} from 'react-native-quick-crypto';
import {AppRegistry} from 'react-native';

installQuickCrypto();
import App from './App';
import {name as appName} from './app.json';
import {initI18n} from './src/i18n';
import {getLanguage} from './src/services/settingsStorage';

getLanguage().then(savedLanguage => initI18n(savedLanguage));

AppRegistry.registerComponent(appName, () => App);
