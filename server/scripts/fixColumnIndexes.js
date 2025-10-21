const mongoose = require("mongoose");
const connectDB = require("../config/database");

const fixColumnIndexes = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log("🔧 Connected to database");

    const db = mongoose.connection.db;
    const collection = db.collection("columns");

    // Get all indexes
    console.log("📋 Current indexes on columns collection:");
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(
        `${i + 1}. ${index.name}: ${JSON.stringify(index.key)} ${
          index.unique ? "(UNIQUE)" : ""
        }`
      );
    });

    // Check if there's a problematic global unique index on status
    const problematicIndex = indexes.find(
      (index) =>
        index.key &&
        index.key.status === 1 &&
        Object.keys(index.key).length === 1 &&
        index.unique
    );

    if (problematicIndex) {
      console.log(
        `\n❌ Found problematic global unique index: ${problematicIndex.name}`
      );
      console.log(
        "This prevents multiple archive columns across different projects"
      );

      // Drop the problematic index
      console.log(`🗑️ Dropping index: ${problematicIndex.name}`);
      await collection.dropIndex(problematicIndex.name);
      console.log("✅ Problematic index dropped successfully");
    } else {
      console.log(
        "\n✅ No problematic global unique index found on status field"
      );
    }

    // Ensure the correct compound index exists
    console.log("\n🔍 Checking for correct compound index...");
    const compoundIndex = indexes.find(
      (index) =>
        index.key &&
        index.key.project === 1 &&
        index.key.status === 1 &&
        index.unique
    );

    if (!compoundIndex) {
      console.log(
        "📝 Creating compound unique index: { project: 1, status: 1 }"
      );
      await collection.createIndex(
        { project: 1, status: 1 },
        { unique: true, name: "project_1_status_1" }
      );
      console.log("✅ Compound index created successfully");
    } else {
      console.log("✅ Correct compound index already exists");
    }

    // List final indexes
    console.log("\n📋 Final indexes on columns collection:");
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(
        `${i + 1}. ${index.name}: ${JSON.stringify(index.key)} ${
          index.unique ? "(UNIQUE)" : ""
        }`
      );
    });

    console.log("\n🎉 Index fix completed successfully!");
  } catch (error) {
    console.error("❌ Error fixing indexes:", error);
    throw error;
  } finally {
    mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  fixColumnIndexes()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

module.exports = fixColumnIndexes;
