import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      family: 4,
      serverSelectionTimeoutMS: 60000, 
    });
    console.log("MongoDB connected ✅");
  } catch (error) {
    console.error("MongoDB could not be connected ❌", error);
  }
};

export default connectDb;
