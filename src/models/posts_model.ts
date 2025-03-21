import { iComment } from "./comments_model";
import mongoose from "mongoose";
export interface iPost {
  title: "string";
  content: "string";
  sender: "string";
  userId: "string";
  image?: string;
  category: string;
  likes: string[];
  comments: string[];
  createdAt?: Date;
}

const postSchema = new mongoose.Schema<iPost>({
  title: {
    type: String,
    required: true,
  },
  content: String,
  sender: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: "",
  },
  category: { type: String, required: true },
  likes: {
    type: [String],
    default: [],
  },
  comments: {
    type: [String],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postModel = mongoose.model<iPost>("Post", postSchema);

export default postModel;
