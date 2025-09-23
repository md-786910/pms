const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const Card = require("../models/Card");
const Notification = require("../models/Notification");
const connectDB = require("../config/database");
const config = require("../config/config");

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log("🌱 Starting database seeding...");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: "admin@pms.com" });
    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Create default admin user
    const adminUser = new User({
      name: "System Administrator",
      email: "admin@pms.com",
      password: "admin123",
      role: "admin",
      avatar: "SA",
      color: "bg-red-600",
      emailVerified: true,
      isActive: true,
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully");

    // Create a sample member user
    const memberUser = new User({
      name: "John Doe",
      email: "john@pms.com",
      password: "member123",
      role: "member",
      avatar: "JD",
      color: "bg-blue-600",
      emailVerified: true,
      isActive: true,
    });

    await memberUser.save();
    console.log("✅ Member user created successfully");

    // Create a sample project
    const sampleProject = new Project({
      name: "Sample Project",
      description: "This is a sample project to demonstrate the system",
      owner: adminUser._id,
      members: [
        {
          user: adminUser._id,
          role: "admin",
        },
        {
          user: memberUser._id,
          role: "member",
        },
      ],
      status: "active",
      color: "blue",
    });

    await sampleProject.save();
    console.log("✅ Sample project created successfully");

    // Create sample cards
    const sampleCards = [
      {
        title: "Welcome to the Project",
        description:
          "This is your first card. You can edit, move, and manage it.",
        project: sampleProject._id,
        status: "todo",
        priority: "medium",
        assignees: [memberUser._id],
        createdBy: adminUser._id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        title: "Set up development environment",
        description: "Configure the development environment for the project",
        project: sampleProject._id,
        status: "doing",
        priority: "high",
        assignees: [adminUser._id],
        createdBy: adminUser._id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
      {
        title: "Review project requirements",
        description: "Review and validate all project requirements",
        project: sampleProject._id,
        status: "review",
        priority: "medium",
        assignees: [memberUser._id],
        createdBy: adminUser._id,
      },
      {
        title: "Complete initial setup",
        description: "Finish the initial project setup",
        project: sampleProject._id,
        status: "done",
        priority: "low",
        assignees: [adminUser._id],
        createdBy: adminUser._id,
      },
    ];

    for (const cardData of sampleCards) {
      const card = new Card(cardData);
      await card.save();
    }
    console.log("✅ Sample cards created successfully");

    // Create sample notifications
    const sampleNotifications = [
      {
        user: memberUser._id,
        sender: adminUser._id,
        type: "project_invite",
        title: "Welcome to Sample Project",
        message: "You have been added to the Sample Project",
        relatedProject: sampleProject._id,
      },
      {
        user: memberUser._id,
        sender: adminUser._id,
        type: "card_assigned",
        title: "Card Assigned",
        message: "You have been assigned to 'Welcome to the Project' card",
        relatedProject: sampleProject._id,
      },
    ];

    for (const notificationData of sampleNotifications) {
      const notification = new Notification(notificationData);
      await notification.save();
    }
    console.log("✅ Sample notifications created successfully");

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Default Credentials:");
    console.log("Admin: admin@pms.com / admin123");
    console.log("Member: john@pms.com / member123");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
