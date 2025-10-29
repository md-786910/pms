require("dotenv").config();
const User = require("../models/User");
const mongoose = require("mongoose");
const colors = [
  "teal",
  "green",
  "purple",
  "orange",
  "pink",
  "red",
  "indigo",
  "#eb3b5a",
  "#4b7bec",
  "#26de81",
  "violet",
  "#2bcbba",
  "#8854d0",
  "#3867d6",
];

const updateUserColor = async () => {
  try {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error("Database connection error:", error.message);
      process.exit(1);
    }
    console.log("🔄 Updating User Colors...");

    const users = await User.find({});
    let updatedCount = 0;

    for (const user of users) {
      // Pick random color
      let newColor = colors[Math.floor(Math.random() * colors.length)];

      // If the random color = current user's color, re-randomize until different
      while (newColor === user.color) {
        newColor = colors[Math.floor(Math.random() * colors.length)];
      }

      // Update only if changed
      await User.findByIdAndUpdate(user._id, { color: newColor });
      console.log(`✅ ${user.name}: ${user.color} → ${newColor}`);
      updatedCount++;
    }

    console.log(`🎯 Completed — Updated ${updatedCount} users.`);
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

updateUserColor();
