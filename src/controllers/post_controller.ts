import postModel, { iPost } from "../models/posts_model";
import { Request, Response } from "express";
import { BaseController } from "./base_controller";
import userModel from "../models/user_model";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

class postController extends BaseController<iPost> {
  constructor() {
    super(postModel);
  }

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      console.log("📥 Received post request:", req.body);

      const { title, content, sender, image, category } = req.body; // ✅ Added category

      if (!title || !content || !sender) {
        console.error("🛑 Missing required fields:", {
          title,
          content,
          sender,
        });
        res.status(400).json({ message: "Missing required fields" });
        return;
      }

      // ✅ Find the user by email to get their ObjectId
      const user = await userModel.findOne({ email: sender });
      if (!user) {
        console.error("🛑 User not found for email:", sender);
        res.status(404).json({ message: "User not found" });
        return;
      }

      console.log("✅ Creating new post in MongoDB for user:", user._id);

      // ✅ Store sender as a reference (ObjectId) instead of email
      const post = new postModel({
        title,
        content,
        sender: user.email, // ✅ Store the User's MongoDB ObjectId
        image: image || "",
        category: category || "Uncategorized", // ✅ Store category
        likes: [],
        comments: [],
        createdAt: new Date(),
      });

      const savedPost = await post.save();
      console.log("✅ Post successfully saved:", savedPost);

      res.status(201).json(savedPost);
    } catch (error) {
      console.error("🛑 Error creating post in MongoDB:", error);
      res.status(500).json({ message: "Server error while creating post" });
    }
  }

  async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      const { id } = req.params;

      if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      const post = await postModel.findById(id);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      const userIndex = post.likes.indexOf(userId);
      if (userIndex === -1) {
        post.likes.push(userId); // ✅ Like
      } else {
        post.likes.splice(userIndex, 1); // ✅ Unlike
      }

      const updatedPost = await post.save();
      res.status(200).json({ likedBy: updatedPost.likes });
    } catch (error) {
      console.error("❌ Error toggling like:", error);
      res.status(500).json({ message: "Server error while toggling like" });
    }
  }

  async getPostSuggestions(req: Request, res: Response): Promise<void> {
    console.log("🔹 Function `getPostSuggestions` was called!");

    try {
      const { userInput } = req.body;
      if (!userInput) {
        console.log("❌ Missing input text.");
        res.status(400).json({ message: "Input text is required." });
        return;
      }

      const prompt = `Suggest 1 post caption based on this topic: "${userInput}"`;

      console.log("📤 Sending request to Gemini with prompt:", prompt);

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();

      // ✅ Ensure suggestions are properly extracted
      const suggestions = text
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      console.log("✅ Gemini AI Suggestions:", suggestions);
      // ✅ Send response only if it hasn't been sent already
      if (!res.headersSent) {
        res.status(200).json({ suggestions });
      }
    } catch (error: any) {
      console.error("❌ Error generating AI post suggestions:", error);

      // ✅ Prevent multiple error responses
      if (!res.headersSent) {
        res.status(500).json({
          message: "Failed to generate post suggestions using Gemini.",
          error: error.message,
        });
      }
    }
  }
}

export default new postController();
