const REQUIRED_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

let firebaseContextPromise = null;

export async function getFirebaseContext() {
  if (!firebaseContextPromise) {
    firebaseContextPromise = createFirebaseContext();
  }

  return firebaseContextPromise;
}

export async function getFirebaseStatus() {
  try {
    const context = await getFirebaseContext();
    return {
      ready: true,
      message: `Firestore is ready for project "${context.projectId}".`,
    };
  } catch (error) {
    return {
      ready: false,
      message: error.message,
    };
  }
}

async function createFirebaseContext() {
  const configModule = await loadFirebaseConfigModule();
  const projectConfig = configModule.firebaseProjectConfig;
  const sdkUrls = configModule.firebaseSdkUrls;

  validateProjectConfig(projectConfig);
  validateSdkUrls(sdkUrls);

  const [{ initializeApp, getApps }, firestoreSdk] = await Promise.all([
    import(sdkUrls.app),
    import(sdkUrls.firestore),
  ]);

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(projectConfig);
  const db = firestoreSdk.getFirestore(app);

  return {
    app,
    db,
    projectId: projectConfig.projectId,
    sdk: firestoreSdk,
  };
}

async function loadFirebaseConfigModule() {
  try {
    return await import('../config/firebase-config.js');
  } catch (error) {
    throw new Error(
      'Missing scripts/config/firebase-config.js. For local development copy firebase-config.example.js. For GitHub Pages deployment generate the file from GitHub Actions secrets.',
    );
  }
}

function validateProjectConfig(config) {
  if (!config) {
    throw new Error('firebaseProjectConfig is missing.');
  }

  const missingKeys = REQUIRED_CONFIG_KEYS.filter((key) => !String(config[key] ?? '').trim());

  if (missingKeys.length > 0) {
    throw new Error(`Firebase project config is incomplete: ${missingKeys.join(', ')}`);
  }
}

function validateSdkUrls(sdkUrls) {
  if (!sdkUrls?.app || !sdkUrls?.firestore) {
    throw new Error('firebaseSdkUrls.app and firebaseSdkUrls.firestore are required.');
  }
}
