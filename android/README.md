# Clearbook Android

Trusted Web Activity shell for https://clearbookdata.in. The website remains the ledger. This project does not store transactions, tokens, or passwords.

## Provisional identity

| Field | Value |
|---|---|
| applicationId | `app.clearbookdata.ledger` (provisional — confirm before any Play listing) |
| versionName | 1.0.0 |
| versionCode | 1 |
| minSdk | 26 |
| compileSdk / targetSdk | 36 |

Do not create or commit a signing key here. Without an upload key, a release bundle is unsigned and is not ready for Play upload.

## Open in Android Studio

Open the `android/` directory. Let Studio install SDK 36 if needed, then run the `app` configuration.

Command-line debug build, after `local.properties` contains `sdk.dir`:

```
gradle wrapper
./gradlew :app:testDebugUnitTest :app:assembleDebug
```

There is no device or emulator in this environment, so login, PDF import, Excel download, and OAuth are not device-tested.
