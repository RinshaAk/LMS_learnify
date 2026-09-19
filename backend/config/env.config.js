import dotenv from 'dotenv'
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: resolve(__dirname, '../.env'),
});

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const env={
    PORT:process.env.PORT,
    NODE_ENV:
    process.env.NODE_ENV,
    MONGO_URL:
    process.env.MONGO_URL,
    JWT_SECRET:process.env.JWT_SECRET,
    CLIENT_URL:process.env.CLIENT_URL,
    CLIENT_URLS: parseList(process.env.CLIENT_URLS),
    REDIS_URL:
  process.env.REDIS_URL ||
  "redis://127.0.0.1:6379",
  ADMIN_NOTIFICATION_EMAIL:
  process.env.ADMIN_NOTIFICATION_EMAIL ||
  "stackversehub@gmail.com",
};
