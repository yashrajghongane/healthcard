import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

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
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;