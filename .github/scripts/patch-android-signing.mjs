import fs from "node:fs";

const gradlePath = process.argv[2] ?? "src-tauri/gen/android/app/build.gradle.kts";

if (!fs.existsSync(gradlePath)) {
  throw new Error(`Android Gradle file not found: ${gradlePath}`);
}

let content = fs.readFileSync(gradlePath, "utf8");

if (!content.includes("import java.io.FileInputStream")) {
  content = `import java.io.FileInputStream\n${content}`;
}

const keystoreBlock = `val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("keystore.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists().also { exists ->
    if (exists) {
        FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
    }
}
`;

if (!content.includes("val keystoreProperties = Properties()")) {
  const tauriPropertiesPattern = /val tauriProperties = Properties\(\)\.apply \{[\s\S]*?\n\}/;
  const match = content.match(tauriPropertiesPattern);
  if (!match) {
    throw new Error("Failed to locate tauriProperties block in Android Gradle file.");
  }
  content = content.replace(match[0], `${match[0]}\n\n${keystoreBlock}`);
}

const signingConfigsBlock = `    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["password"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["password"] as String
            }
        }
    }
`;

if (!content.includes("signingConfigs {")) {
  content = content.replace("\n    buildTypes {", `\n${signingConfigsBlock}\n    buildTypes {`);
}

const releaseSigningLine = `            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
`;

if (!content.includes('signingConfig = signingConfigs.getByName("release")')) {
  content = content.replace(
    '        getByName("release") {\n',
    `        getByName("release") {\n${releaseSigningLine}`
  );
}

fs.writeFileSync(gradlePath, content, "utf8");
