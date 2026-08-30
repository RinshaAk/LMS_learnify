import mongoose from "mongoose";

const connectDB = async (MONGO_URL) => {
  try {
    if (!MONGO_URL) {
      throw new Error("MONGO_URL is required");
    }

    await mongoose.connect(MONGO_URL, {
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    });

    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err.message);
    process.exit(1);
  }
};

export default connectDB;
