const mongoose = require("mongoose");
const Card = require("../models/Card");
const connectDB = require("../config/database");

const migrateCardNumbers = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log("🔄 Starting card number migration...");

    // Get all projects
    const projects = await Card.distinct("project");

    for (const projectId of projects) {
      // Get all cards for this project
      const cards = await Card.find({ project: projectId }).sort({
        createdAt: 1,
      });

      console.log(`📊 Project ${projectId}: Found ${cards.length} cards`);

      let cardNumber = 1;
      for (const card of cards) {
        // Only update if card doesn't have a cardNumber
        if (!card.cardNumber) {
          card.cardNumber = cardNumber;
          await card.save();
          console.log(
            `  ✓ Updated card "${card.title}" with number ${cardNumber}`
          );
        }
        cardNumber++;
      }
    }

    console.log("✅ Card number migration completed successfully!");
  } catch (error) {
    console.error("❌ Error migrating card numbers:", error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
    console.log("👋 Database connection closed");
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateCardNumbers();
}

module.exports = migrateCardNumbers;
