import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? "kora";

declare global {
  var mongooseConnPromise: Promise<typeof mongoose> | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.mongooseConnPromise) {
    global.mongooseConnPromise = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
      directConnection: true,
    });
  }

  return global.mongooseConnPromise;
}
