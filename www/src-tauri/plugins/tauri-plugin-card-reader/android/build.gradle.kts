import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

kotlin { compilerOptions { jvmTarget = JvmTarget.JVM_1_8 } }

android {
    namespace = "org.pherus.cardreader"
    compileSdk = 37
    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation(project(":tauri-android"))
    // Bundled, so scanning works on the first launch without downloading a model.
    implementation("com.google.mlkit:text-recognition:16.0.1")
}
