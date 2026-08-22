import { createClient } from "redis";

const redisClient = createClient({
  url:
    process.env.REDIS_URL ||
    "redis://127.0.0.1:6379",

  socket: {
    connectTimeout: 10000,

    reconnectStrategy(retries) {
      if (retries > 10) {
        return new Error(
          "Redis connection retry limit reached"
        );
      }

      return Math.min(retries * 200, 3000);
    },
  },
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis connected and ready");
});

redisClient.on("reconnecting", () => {
  console.warn("Redis reconnecting...");
});

redisClient.on("error", (error) => {
  console.error(
    "Redis connection error:",
    error.message
  );
});

redisClient.on("end", () => {
  console.warn("Redis connection closed");
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  const response = await redisClient.ping();

  if (response !== "PONG") {
    throw new Error("Redis health check failed");
  }

  console.log("Redis health check: PONG");
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export default redisClient;