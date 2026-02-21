import mongoose from "mongoose";

let lastMongoConnectionError = null;

function resolveMongoUri() {
  return process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || "";
}

export function getLastMongoConnectionError() {
  return lastMongoConnectionError;
}

export function isMongoUriConfigured() {
  return Boolean(resolveMongoUri());
}

const connectDB = async () => {
  const mongoUri = resolveMongoUri();
  if (!mongoUri) {
    lastMongoConnectionError = "Missing Mongo URI. Set MONGO_URI (or MONGODB_URI/DATABASE_URL).";
    throw new Error(lastMongoConnectionError);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });
    lastMongoConnectionError = null;

    const patientsCollection = conn.connection.db.collection("patients");
    try {
      await patientsCollection.dropIndex("qrCodeId_1");
    } catch {
    }

    try {
      await patientsCollection.updateMany(
        {
          $or: [
            { qrCodeId: { $exists: false } },
            { qrCodeId: null },
            { qrCodeId: "" }
          ]
        },
        [
          {
            $set: {
              qrCodeId: "$healthCardId"
            }
          }
        ]
      );
    } catch {
    }

    try {
      await patientsCollection.createIndex(
        { qrCodeId: 1 },
        { name: "qrCodeId_1", unique: true, sparse: true }
      );
    } catch {
    }

    console.log("MongoDB Connected:", conn.connection.host);
    return true;
  } catch (error) {
    lastMongoConnectionError = error.message || "MongoDB connection failed";
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;