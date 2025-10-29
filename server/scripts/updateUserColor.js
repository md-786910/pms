/*
"bg-blue-400",
"bg-green-400",
"bg-purple-400",
"bg-orange-400",
"bg-pink-400",
"bg-red-400",
"bg-indigo-400",
"bg-yellow-400",
"bg-cyan-400",
"bg-emerald-400",
"bg-violet-400",
"bg-rose-400",
"bg-sky-400",
"bg-lime-400"
 */

const connectDB = require("../config/database");
const User = require("../models/User");

const colors = [
  "bg-teal-400",
  "bg-green-400",
  "bg-purple-400",
  "bg-orange-400",
  "bg-pink-400",
  "bg-red-400",
  "bg-indigo-400",
  "bg-yellow-400",
  "bg-cyan-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-rose-400",
  "bg-sky-400",
  "bg-lime-400",
];

const updateUserColor = async () => {
  try {
    await connectDB();

    console.log("🔄 Starting user color update process...");

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to update`);

    let updatedCount = 0;

    for (const user of users) {
      // Generate new color based on name
      let newColor = colors[user.name.charCodeAt(0) % colors.length];
      // Update user if color changed
      if (user.color !== newColor) {
        await User.findByIdAndUpdate(user._id, { color: newColor });
        console.log(`✅ Updated ${user.name}: ${user.color} → ${newColor}`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped ${user.name}: color already correct`);
      }
    }

    console.log(
      `🎉 User color update completed! Updated ${updatedCount} users.`
    );
  } catch (error) {
    console.error("❌ Error updating user color:", error);
    process.exit(1);
  }
};

updateUserColor();
