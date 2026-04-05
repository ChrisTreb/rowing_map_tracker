# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# 📦 Build APK Android en local (sans EAS)

Ce guide explique comment générer un APK Android pour un projet React Native / Expo **sans utiliser EAS**, directement sur Windows.

---

## ⚙️ Prérequis

- **Node.js** ≥ 18
- **Expo CLI** : `npm install -g expo-cli`
- **Java JDK 17** (important pour Android Gradle)
- **Android Studio** + SDK Android
- **Git** (pour cloner le projet)

---

## 1️⃣ Préparer le projet

Si ton projet est en workflow Expo :

```bash
git clone https://github.com/ton-utilisateur/ton-projet.git
cd ton-projet
npm install
```

## 2️⃣ Prébuild pour Android

Expo utilise maintenant un workflow “bare” pour les builds locaux :

```bash
npx expo prebuild
```

👉 Cela crée le dossier android/ contenant le projet natif.

## 3️⃣ Configurer Java / Gradle

### 3a. Forcer JDK 17

Dans android/gradle.properties ajoute :

org.gradle.java.home=C:\\Program Files\\Java\\jdk-17

⚠️ Remplace par le chemin exact de ton JDK 17.
⚠️ Double backslash \\ obligatoire sur Windows.

### 3b. Vérifier JAVA_HOME

```bash
echo %JAVA_HOME%
```

Doit pointer vers Java 17.

## ️4️⃣ Build l’APK Release

Depuis le dossier android/ :

```bash
./gradlew.bat clean
./gradlew.bat assembleRelease
```

## 5️⃣ Récupérer l’APK

L’APK final se trouve ici :

android/app/build/outputs/apk/release/app-release.apk

## 6️⃣ Signer l’APK (si besoin)

Pour installer sur un vrai appareil :

Générer une clé :
```bash
keytool -genkey -v -keystore my-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
Ajouter la configuration dans android/app/build.gradle :

```bash
signingConfigs {
    release {
        storeFile file('my-key.keystore')
        storePassword 'XXX'
        keyAlias 'my-key-alias'
        keyPassword 'XXX'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```
## 7️⃣ Notes importantes
⚠️ Les tuiles OpenStreetMap peuvent donner 403 si le userAgent ou Referer n’est pas défini.
⚠️ Java 18+ ou 21+ casseront le build → rester sur JDK 17.
⚠️ Nettoyer le projet (gradlew clean) avant de relancer un build.