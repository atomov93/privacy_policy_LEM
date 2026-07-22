# LetsMessageEncrypt 1.2.0 — Release Notes

## English (full)

### What’s New

#### Encrypted `.lme` key transfer
- Share keys as passphrase-protected `.lme` files for remote transfer
- Import `.lme` files from Files / document picker
- High-entropy transfer passphrase; file contents stay encrypted at rest

#### Clearer copy & paste feedback
- Visible confirmation when you copy or paste secrets and fingerprints
- Works reliably inside share and import sheets

#### Smarter key management
- Keys with the same secret (fingerprint) no longer create duplicates when renamed or re-imported
- Existing duplicate entries are cleaned up automatically

#### Lock & reliability
- Biometric / device lock fails closed and no longer gets stuck when no screen lock is set
- Sharing large encrypted payloads no longer freezes or crashes the app
- Sensitive clipboard contents clear automatically after a short time

#### Security hardening
- Key database protected with Keychain / Keystore–backed encryption
- Authenticated encryption for messages and transfer files
- PIN-protected QR key transfer

---

## App Store / Play Console — “What’s New” (all languages)

Copy the block for each store localization.

### English (en)
Share keys securely with encrypted .lme files, get clear copy/paste confirmation, and avoid duplicate keys when renaming or re-importing. This release also improves lock-screen reliability and overall security.

### Български (bg)
Споделяйте ключове сигурно с шифровани .lme файлове, получавайте ясно потвърждение при копиране и поставяне и избягвайте дублирани ключове при преименуване или повторно импортиране. Тази версия подобрява и надеждността на заключването на екрана и общата сигурност.

### Hrvatski (hr)
Sigurno dijelite ključeve pomoću šifriranih .lme datoteka, dobijte jasnu potvrdu pri kopiranju i lijepljenju te izbjegnite duple ključeve pri preimenovanju ili ponovnom uvozu. Ovo izdanje također poboljšava pouzdanost zaključavanja zaslona i ukupnu sigurnost.

### Čeština (cs)
Bezpečně sdílejte klíče pomocí šifrovaných souborů .lme, získejte jasné potvrzení při kopírování a vkládání a vyhněte se duplicitním klíčům při přejmenování nebo opětovném importu. Tato verze také zlepšuje spolehlivost zámku obrazovky a celkovou bezpečnost.

### Dansk (da)
Del nøgler sikkert med krypterede .lme-filer, få tydelig bekræftelse ved kopiering og indsættelse, og undgå dubletter ved omdøbning eller genimport. Denne version forbedrer også pålideligheden af skærmlåsen og den generelle sikkerhed.

### Nederlands (nl)
Deel sleutels veilig met versleutelde .lme-bestanden, krijg duidelijke bevestiging bij kopiëren en plakken, en voorkom dubbele sleutels bij hernoemen of opnieuw importeren. Deze release verbetert ook de betrouwbaarheid van de schermvergrendeling en de algehele beveiliging.

### Eesti (et)
Jagage võtmeid turvaliselt krüpteeritud .lme-failidega, saage kopeerimisel ja kleepimisel selge kinnitus ning vältige topeltvõtmeid ümbernimetamisel või uuesti importimisel. See versioon parandab ka lukustusekraani usaldusväärsust ja üldist turvalisust.

### Suomi (fi)
Jaa avaimia turvallisesti salatuilla .lme-tiedostoilla, saat selkeän vahvistuksen kopioinnista ja liittämisestä, etkä saa kaksoiskappaleita uudelleennimettäessä tai tuodessasi uudelleen. Tämä versio parantaa myös lukitusnäytön luotettavuutta ja yleistä turvallisuutta.

### Français (fr)
Partagez des clés en toute sécurité avec des fichiers .lme chiffrés, obtenez une confirmation claire lors du copier-coller, et évitez les doublons lors d’un renommage ou d’une réimportation. Cette version améliore aussi la fiabilité du verrouillage d’écran et la sécurité globale.

### Deutsch (de)
Teilen Sie Schlüssel sicher mit verschlüsselten .lme-Dateien, erhalten Sie eine klare Bestätigung beim Kopieren und Einfügen und vermeiden Sie doppelte Schlüssel beim Umbenennen oder erneuten Importieren. Dieses Update verbessert außerdem die Zuverlässigkeit der Bildschirmsperre und die allgemeine Sicherheit.

### Ελληνικά (el)
Μοιραστείτε κλειδιά με ασφάλεια μέσω κρυπτογραφημένων αρχείων .lme, λάβετε σαφή επιβεβαίωση κατά την αντιγραφή και την επικόλληση και αποφύγετε διπλότυπα κλειδιά κατά τη μετονομασία ή την εκ νέου εισαγωγή. Αυτή η έκδοση βελτιώνει επίσης την αξιοπιστία του κλειδώματος οθόνης και τη συνολική ασφάλεια.

### Magyar (hu)
Osszon meg kulcsokat biztonságosan titkosított .lme fájlokkal, kapjon egyértelmű visszajelzést másoláskor és beillesztéskor, és kerülje el a duplikált kulcsokat átnevezés vagy újraimportálás esetén. Ez a kiadás a képernyőzár megbízhatóságát és az általános biztonságot is javítja.

### Gaeilge (ga)
Comhroinn eochracha go slán le comhaid .lme criptithe, faigh deimhniú soiléir agus tú ag cóipeáil agus ag greamú, agus seachain eochracha dúbailte agus iad á n-athainmniú nó á n-ath-allmhairiú. Feabhsaíonn an leagan seo iontaofacht ghlas an scáileáin agus an tslándáil iomlán freisin.

### Italiano (it)
Condividi le chiavi in modo sicuro con file .lme crittografati, ricevi una conferma chiara quando copi e incolli ed evita chiavi duplicate quando rinomini o reimporti. Questa versione migliora anche l’affidabilità del blocco schermo e la sicurezza complessiva.

### Latviešu (lv)
Droši kopīgojiet atslēgas ar šifrētiem .lme failiem, saņemiet skaidru apstiprinājumu, kopējot un ielīmējot, un izvairieties no dublētām atslēgām, pārdēvējot vai atkārtoti importējot. Šis laidienums uzlabo arī ekrāna bloķēšanas uzticamību un vispārējo drošību.

### Lietuvių (lt)
Saugiai dalinkitės raktais naudodami šifruotus .lme failus, gaukite aiškų patvirtinimą kopijuojant ir įklijuojant bei išvenkite pasikartojančių raktų pervardijant ar iš naujo importuojant. Ši versija taip pat pagerina ekrano užrakto patikimumą ir bendrą saugumą.

### Malti (mt)
Aqsam iċ-ċwievet b’mod sigur b’fajls .lme enkriptati, ikollok konferma ċara meta tikkopja u twaħħal, u evita ċwievet duplikati meta terġa’ ssemmihom jew timportahom mill-ġdid. Din il-verżjoni ttejjeb ukoll l-affidabbiltà tal-illokkjar tal-iskrin u s-sigurtà ġenerali.

### Polski (pl)
Udostępniaj klucze bezpiecznie za pomocą zaszyfrowanych plików .lme, otrzymuj wyraźne potwierdzenie przy kopiowaniu i wklejaniu oraz unikaj duplikatów przy zmianie nazwy lub ponownym imporcie. Ta wersja poprawia też niezawodność blokady ekranu i ogólne bezpieczeństwo.

### Português (pt)
Partilhe chaves de forma segura com ficheiros .lme encriptados, obtenha confirmação clara ao copiar e colar e evite chaves duplicadas ao mudar o nome ou reimportar. Esta versão também melhora a fiabilidade do bloqueio de ecrã e a segurança geral.

### Română (ro)
Partajați cheile în siguranță cu fișiere .lme criptate, primiți confirmare clară la copiere și lipire și evitați cheile duplicate la redenumire sau reimport. Această versiune îmbunătățește și fiabilitatea blocării ecranului și securitatea generală.

### Slovenčina (sk)
Bezpečne zdieľajte kľúče pomocou šifrovaných súborov .lme, získajte jasné potvrdenie pri kopírovaní a vkladaní a vyhnite sa duplicitným kľúčom pri premenovaní alebo opätovnom importe. Táto verzia tiež zlepšuje spoľahlivosť zámku obrazovky a celkovú bezpečnosť.

### Slovenščina (sl)
Varno delite ključe s šifriranimi datotekami .lme, prejmite jasno potrditev pri kopiranju in lepljenju ter se izognite podvojenim ključem pri preimenovanju ali ponovnem uvozu. Ta različica izboljšuje tudi zanesljivost zaklepa zaslona in splošno varnost.

### Español (es)
Comparte claves de forma segura con archivos .lme cifrados, recibe una confirmación clara al copiar y pegar, y evita claves duplicadas al renombrar o volver a importar. Esta versión también mejora la fiabilidad del bloqueo de pantalla y la seguridad general.

### Svenska (sv)
Dela nycklar säkert med krypterade .lme-filer, få tydlig bekräftelse vid kopiering och inklistring och undvik dubbletter vid namnbyte eller återimport. Den här versionen förbättrar också tillförlitligheten hos skärmlåset och den övergripande säkerheten.
