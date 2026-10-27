# Askegrav

Original actionrollespil inspireret af klassiske dungeon crawlers. Mobilvenlig browserprototype med tre niveauer, nærkamp, ildmagi, loot og en slutboss. Ingen eksterne assets, API-nøgler eller pakker kræves.

## Kør lokalt

```sh
cd /workspace/D1mobile
python3 -m http.server 8080 --bind 0.0.0.0
```

Touch: venstre joystick til bevægelse, højre knapper til angreb, ild og helbredelse. Tastatur: WASD/pile, mellemrum (angreb), F (ild), E (drik). Dræb alle fjender på et niveau og gå til trappen nederst til højre. Besejr vogteren på niveau 3.

Dette er en prototype; der er endnu ingen gemte spil, lyd, appbutikspakke eller multiplayer.

## iOS og Android

Node.js 22+ og npm kræves. Installer med `npm ci`, byg med `npm run build`, og synkroniser native-projekterne med `npm run sync` efter hver ændring.

- Android: Java 21, Android SDK platform 36 og build-tools 35.0.0 / 36.0.0. Åbn med `npm run android`, eller byg en debug-APK med `cd android && ./gradlew assembleDebug`. APK findes i `android/app/build/outputs/apk/debug/`.
- iOS: macOS med Xcode og den iOS SDK, Capacitor 8 kræver. Åbn med `npm run ios`, vælg simulator eller enhed i Xcode, og byg. Native-projektet bruger Swift Package Manager.

App-id'et `dk.askegrav.game` er foreløbigt. Udgivelse kræver eget app-id, signering og udviklerkonti. iOS-build og test på fysiske enheder er endnu ikke udført.

## Dette cloudmiljø

`npm --cache /workspace/.npm-cache ci` bruger en skrivbar cache. Android SDK ligger i `/workspace/android-sdk`. JDK 21 ligger i `/workspace/java21`. Brug `JAVA_HOME=/workspace/java21`, `ANDROID_USER_HOME=/workspace/.android`, `ANDROID_HOME=/workspace/android-sdk`, `GRADLE_USER_HOME=/workspace/.gradle-cache` og Java-proxyindstillingerne `-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts -Dhttps.proxyHost=proxy -Dhttps.proxyPort=8080 -Dhttp.proxyHost=proxy -Dhttp.proxyPort=8080` i `JAVA_TOOL_OPTIONS` ved Gradle-builds her.
