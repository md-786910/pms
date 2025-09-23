const Column = require("../models/Column");
const Card = require("../models/Card");
const CardItem = require("../models/CardItem");
const Notification = require("../models/Notification");
const Invitation = require("../models/Invitation");

/**
 * Asynchronously clean up all data associated with a project
 * @param {string} projectId - The ID of the project to clean up
 * @returns {Promise<Object>} - Summary of cleanup results
 */
const cleanupProjectData = async (projectId) => {
  try {
    console.log(`🗑️ Starting async cleanup for project ${projectId}...`);

    // First, get all card IDs before deleting cards
    const cardIds = await Card.find({ project: projectId })
      .select("_id")
      .lean();
    const cardIdArray = cardIds.map((card) => card._id);

    // Execute cleanup operations in parallel for better performance
    const cleanupPromises = [
      // Delete all columns associated with this project
      Column.deleteMany({ project: projectId }).then((result) => {
        console.log(
          `✅ Deleted ${result.deletedCount} columns for project ${projectId}`
        );
        return { type: "columns", count: result.deletedCount };
      }),

      // Delete all cards associated with this project
      Card.deleteMany({ project: projectId }).then((result) => {
        console.log(
          `✅ Deleted ${result.deletedCount} cards for project ${projectId}`
        );
        return { type: "cards", count: result.deletedCount };
      }),

      // Delete all card items associated with cards from this project
      CardItem.deleteMany({ card: { $in: cardIdArray } }).then((result) => {
        console.log(
          `✅ Deleted ${result.deletedCount} card items for project ${projectId}`
        );
        return { type: "cardItems", count: result.deletedCount };
      }),

      // Delete all notifications related to this project
      Notification.deleteMany({ relatedProject: projectId }).then((result) => {
        console.log(
          `✅ Deleted ${result.deletedCount} notifications for project ${projectId}`
        );
        return { type: "notifications", count: result.deletedCount };
      }),

      // Delete all invitations related to this project
      Invitation.deleteMany({ project: projectId }).then((result) => {
        console.log(
          `✅ Deleted ${result.deletedCount} invitations for project ${projectId}`
        );
        return { type: "invitations", count: result.deletedCount };
      }),
    ];

    // Wait for all cleanup operations to complete
    const results = await Promise.all(cleanupPromises);

    // Calculate total deleted items
    const totalDeleted = results.reduce((sum, result) => sum + result.count, 0);

    console.log(
      `🎉 Async cleanup completed for project ${projectId}. Total items deleted: ${totalDeleted}`
    );

    return {
      success: true,
      projectId,
      totalDeleted,
      details: results,
    };
  } catch (error) {
    console.error(
      `❌ Error during async cleanup for project ${projectId}:`,
      error
    );
    return {
      success: false,
      projectId,
      error: error.message,
    };
  }
};

/**
 * Schedule project cleanup to run asynchronously
 * @param {string} projectId - The ID of the project to clean up
 */
const scheduleProjectCleanup = (projectId) => {
  setImmediate(() => {
    cleanupProjectData(projectId);
  });
};

module.exports = {
  cleanupProjectData,
  scheduleProjectCleanup,
};
