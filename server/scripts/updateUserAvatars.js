const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/database");

const updateUserAvatars = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log("🔄 Starting avatar update process...");

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to update`);

    let updatedCount = 0;

    for (const user of users) {
      // Generate new avatar based on name
      let newAvatar = "U";
      if (user.name) {
        const nameParts = user.name.trim().split(" ");
        if (nameParts.length >= 2) {
          // First letter of first name + first letter of last name
          newAvatar = (
            nameParts[0][0] + nameParts[nameParts.length - 1][0]
          ).toUpperCase();
        } else if (nameParts.length === 1) {
          // If only one name, use first two letters
          newAvatar = nameParts[0].substring(0, 2).toUpperCase();
        }
      }

      // Update user if avatar changed
      if (user.avatar !== newAvatar) {
        await User.findByIdAndUpdate(user._id, {
          avatar: newAvatar,
          // Also update color to ensure it's properly formatted with darker colors
          color: user.color || "bg-gray-600",
        });
        console.log(
          `✅ Updated ${user.name} (${user.email}): ${user.avatar} → ${newAvatar}`
        );
        updatedCount++;
      } else {
        console.log(
          `⏭️  Skipped ${user.name} (${user.email}): avatar already correct`
        );
      }
    }

    console.log(`🎉 Avatar update completed! Updated ${updatedCount} users.`);
  } catch (error) {
    console.error("❌ Error updating avatars:", error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  updateUserAvatars();
}

module.exports = updateUserAvatars;
