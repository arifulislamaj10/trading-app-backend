import "dotenv/config";

// Validate required environment variables
const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'DB_URL',
    'ACCESS_TOKEN',
    'REFRESH_TOKEN',
    'ACCESS_EXPIRES',
    'REFRESH_EXPIRES',
    'RESET_SECRET',
    'RESET_EXPIRES',
    'FRONT_END_URL',
    'VERIFIED_TOKEN',
];

const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missingEnvVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n📝 Copy .env.example to .env and fill in the values:\n');
    console.error('   cp .env.example .env\n');
    throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
}

// Validate JWT secret strength
const minSecretLength = 32;
const validateSecret = (secret: string | undefined, name: string) => {
    if (secret && secret.length < minSecretLength) {
        throw new Error(
            `${name} must be at least ${minSecretLength} characters long. ` +
            `Current length: ${secret?.length || 0}. ` +
            `Use a strong random string (e.g., openssl rand -hex 32)`
        );
    }
};
// test
validateSecret(process.env.ACCESS_TOKEN, 'ACCESS_TOKEN');
validateSecret(process.env.REFRESH_TOKEN, 'REFRESH_TOKEN');
validateSecret(process.env.RESET_SECRET, 'RESET_SECRET');
validateSecret(process.env.VERIFIED_TOKEN, 'VERIFIED_TOKEN');

export const configs = {
    port: process.env.PORT,
    env: process.env.NODE_ENV,
    jwt: {
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN,
        access_expires: process.env.ACCESS_EXPIRES,
        refresh_expires: process.env.REFRESH_EXPIRES,
        reset_secret: process.env.RESET_SECRET,
        reset_expires: process.env.RESET_EXPIRES,
        front_end_url: process.env.FRONT_END_URL,
        verified_token: process.env.VERIFIED_TOKEN
    },
    db_url: process.env.DB_URL,
    aws: {
        region: process.env.AWS_REGION,
        access_key_id: process.env.AWS_ACCESS_KEY_ID,
        secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
        bucket_name: process.env.AWS_BUCKET_NAME,
        public_base_url: process.env.AWS_S3_PUBLIC_BASE_URL,
    },
    upload: {
        storage: (process.env.UPLOAD_STORAGE || "auto").toLowerCase(),
    },
    cloudinary: {
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET,
    },
    email: {
        app_email: process.env.APP_USER_EMAIL,
        app_password: process.env.APP_PASSWORD
    },
    ip: {
        backend_ip: process.env.BACKEND_IP,
        backend_url: process.env.BACKEND_URL,
    },
    seed: {
        admin_email: process.env.ADMIN_EMAIL,
        admin_password: process.env.ADMIN_PASSWORD,
        auto_seed: process.env.AUTO_SEED !== 'false', // Default to true
    },
    allowed_origins: process.env.ALLOWED_ORIGINS,
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        frontend_url: process.env.STRIPE_FRONTEND_URL || 'http://localhost:3000',
    },
    /** Groq (OpenAI-compatible) — used for signal validation & MT assist */
    ai: {
        apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS) || 15000,
    },
    features: {
        signalAiWorkflow: process.env.SIGNAL_AI_WORKFLOW_ENABLED === 'true',
    },
};
