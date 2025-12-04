const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Project = require("../models/Project");
const { auth, adminAuth } = require("../middleware/auth");

// Get all categories (sorted alphabetically)
router.get("/", auth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .populate("createdBy", "name email");

    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all categories with project counts
router.get("/with-counts", auth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 })
      .populate("createdBy", "name email");

    // Get project counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const projectCount = await Project.countDocuments({
          category: category._id,
          isArchived: false,
        });
        return {
          ...category.toObject(),
          projectCount,
        };
      })
    );

    // Also get count of uncategorized projects
    const uncategorizedCount = await Project.countDocuments({
      category: { $exists: false },
      isArchived: false,
    });

    res.json({
      categories: categoriesWithCounts,
      uncategorizedCount,
    });
  } catch (error) {
    console.error("Error fetching categories with counts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single category
router.get("/:id", auth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create category (admin only)
router.post("/", auth, adminAuth, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // Check if category with same name exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ message: "A category with this name already exists" });
    }

    const category = new Category({
      name,
      description: description || "",
      color: color || "#6366f1",
      icon: icon || "Folder",
      createdBy: req.user._id,
    });

    await category.save();
    await category.populate("createdBy", "name email");

    res.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update category (admin only)
router.put("/:id", auth, adminAuth, async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "A category with this name already exists" });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (color) category.color = color;
    if (icon) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    await category.populate("createdBy", "name email");

    res.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete category (admin only)
router.delete("/:id", auth, adminAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if category has projects
    const projectCount = await Project.countDocuments({ category: req.params.id });

    if (projectCount > 0) {
      // Option 1: Prevent deletion
      // return res.status(400).json({
      //   message: `Cannot delete category. ${projectCount} project(s) are using this category.`
      // });

      // Option 2: Remove category from projects
      await Project.updateMany(
        { category: req.params.id },
        { $unset: { category: "" } }
      );
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({ message: "Category deleted successfully", projectCount });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get projects by category
router.get("/:id/projects", auth, async (req, res) => {
  try {
    const projects = await Project.find({
      category: req.params.id,
      isArchived: false,
      $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("owner", "name email profileImage")
      .populate("members.user", "name email profileImage")
      .sort({ name: 1 });

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects by category:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
