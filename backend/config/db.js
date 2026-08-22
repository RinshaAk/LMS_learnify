import mongoose from "mongoose";

const connectDB = async (MONGO_URL) => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
};

export default connectDB;