plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Provisional id. `in.*` is not used because `in` is a Kotlin keyword.
// Confirm this id before any Play listing. It cannot be changed later for that listing.
android {
    namespace = "app.clearbookdata.ledger"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.clearbookdata.ledger"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "1.0.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // No upload key is configured. bundleRelease is unsigned and not Play-upload ready.
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.browser:browser:1.8.0")
    testImplementation("junit:junit:4.13.2")
}
