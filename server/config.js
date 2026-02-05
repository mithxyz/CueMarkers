require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'cuemarkers',
    user: process.env.DB_USER || 'cuemarkers',
    password: process.env.DB_PASSWORD || 'cuemarkers',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'cuemarkers',
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
};
