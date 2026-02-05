require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'cuemarkers',
      user: process.env.DB_USER || 'cuemarkers',
      password: process.env.DB_PASSWORD || 'cuemarkers',
    },
    migrations: {
      directory: './server/db/migrations',
    },
    pool: { min: 2, max: 10 },
  },
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: './server/db/migrations',
    },
    pool: { min: 2, max: 20 },
  },
};
