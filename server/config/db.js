import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  try {
    const conn = await mongoose.connect(mongoUri);

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
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;