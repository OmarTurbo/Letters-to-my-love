import mongoose from "mongoose";

export async function connectDatabase({ mongoUri, mongoDb }) {
  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    dbName: mongoDb,
    serverSelectionTimeoutMS: 10000
  });

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
