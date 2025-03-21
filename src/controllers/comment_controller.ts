import commentsModel, {iComment} from "../models/comments_model";
import { Request, Response } from "express";
import { BaseController } from "./base_controller";
import { log } from "console";
import userModel from "../models/user_model"; // ✅ Import user model


class commentController extends BaseController<iComment> {
    constructor(){
        super(commentsModel);
    }

    async createItem(req: Request, res: Response): Promise<void> {
        try {
            const { sender, postId, content, profilePic } = req.body; // ✅ Add profilePic
    
            if (!sender || !postId || !content) {
                res.status(400).json({ message: "Missing required fields" });
                return;
            }
    
            const newComment = new commentsModel({
                sender,
                postId,
                comment: content,
                profilePic: profilePic || "", // ✅ Store profilePic if available
            });
    
            const savedComment = await newComment.save();
            res.status(201).json(savedComment);
        } catch (error) {
            console.error("Error creating comment:", error);
            res.status(500).json({ message: "Server error while creating comment" });
        }
    }

    async getCommentsByPostId(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            if (!postId) return res.status(400).json({ message: "Post ID is required" });
    
            const comments = await commentsModel.find({ postId });
    
            // ✅ Fetch profile picture for each comment sender dynamically
            const updatedComments = await Promise.all(
                comments.map(async (comment) => {
                    const user = await userModel.findOne({ email: comment.sender });
                    return { 
                        ...comment.toObject(), 
                        profilePic: user?.imgUrl || "/default-avatar.png" // ✅ Fetch dynamically
                    };
                })
            );
    
            return res.status(200).json(updatedComments);
        } catch (error) {
            console.error("Error fetching comments:", error);
            return res.status(500).json({ message: "Server error while fetching comments" });
        }
    }
     
}


export default new commentController(); 



