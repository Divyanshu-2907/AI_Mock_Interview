interface EnvConfig {
  // Firebase Client
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  
  // Firebase Admin
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  
  // Vapi AI
  NEXT_PUBLIC_VAPI_API_KEY: string;
  VAPI_API_KEY: string;
  NEXT_PUBLIC_VAPI_WORKFLOW_ID: string;
  
  // OpenAI
  OPENAI_API_KEY: string;
}

function getRequiredEnvVar(key: keyof EnvConfig): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

export function validateEnv(): EnvConfig {
  try {
    // Required Firebase Client variables
    const NEXT_PUBLIC_FIREBASE_API_KEY = getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY');
    const NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    const NEXT_PUBLIC_FIREBASE_PROJECT_ID = getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    const NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    const NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    const NEXT_PUBLIC_FIREBASE_APP_ID = getRequiredEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID');
    
    // Required Firebase Admin variables
    const FIREBASE_PROJECT_ID = getRequiredEnvVar('FIREBASE_PROJECT_ID');
    const FIREBASE_CLIENT_EMAIL = getRequiredEnvVar('FIREBASE_CLIENT_EMAIL');
    const FIREBASE_PRIVATE_KEY = getRequiredEnvVar('FIREBASE_PRIVATE_KEY');
    
    // Required Vapi variables
    const NEXT_PUBLIC_VAPI_API_KEY = getRequiredEnvVar('NEXT_PUBLIC_VAPI_API_KEY');
    const VAPI_API_KEY = getRequiredEnvVar('VAPI_API_KEY');
    const NEXT_PUBLIC_VAPI_WORKFLOW_ID = getRequiredEnvVar('NEXT_PUBLIC_VAPI_WORKFLOW_ID');
    
    // Required OpenAI variable
    const OPENAI_API_KEY = getRequiredEnvVar('OPENAI_API_KEY');
    
    return {
      NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID,
      FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY,
      NEXT_PUBLIC_VAPI_API_KEY,
      VAPI_API_KEY,
      NEXT_PUBLIC_VAPI_WORKFLOW_ID,
      OPENAI_API_KEY,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Environment validation failed:', error);
      throw error;
    } else {
      console.warn('Environment validation failed (using defaults for development):', error);
      
      // Return development defaults
      return {
        NEXT_PUBLIC_FIREBASE_API_KEY: getOptionalEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'demo-api-key'),
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: getOptionalEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'demo.firebaseapp.com'),
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: getOptionalEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-project'),
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: getOptionalEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'demo.appspot.com'),
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: getOptionalEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '123456789'),
        NEXT_PUBLIC_FIREBASE_APP_ID: getOptionalEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', '1:123456789:web:abcdef'),
        FIREBASE_PROJECT_ID: getOptionalEnvVar('FIREBASE_PROJECT_ID', 'demo-project'),
        FIREBASE_CLIENT_EMAIL: getOptionalEnvVar('FIREBASE_CLIENT_EMAIL', 'demo@demo-project.iam.gserviceaccount.com'),
        FIREBASE_PRIVATE_KEY: getOptionalEnvVar('FIREBASE_PRIVATE_KEY', '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n'),
        NEXT_PUBLIC_VAPI_API_KEY: getOptionalEnvVar('NEXT_PUBLIC_VAPI_API_KEY', 'demo-vapi-key'),
        VAPI_API_KEY: getOptionalEnvVar('VAPI_API_KEY', 'demo-vapi-secret'),
        NEXT_PUBLIC_VAPI_WORKFLOW_ID: getOptionalEnvVar('NEXT_PUBLIC_VAPI_WORKFLOW_ID', 'demo-workflow'),
        OPENAI_API_KEY: getOptionalEnvVar('OPENAI_API_KEY', 'demo-openai-key'),
      };
    }
  }
}

export const env = validateEnv();
