import dotenv from 'dotenv';
dotenv.config();

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const HOST = process.env.HOST || 'localhost';
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
