import mongoose from "mongoose";

export interface iComment {
    comment: 'string';
    sender: 'string';
    postId: 'string';
    profilePic?: string; // ✅ Add profile picture field
    createdAt?: Date;
}


const commentSchema = new mongoose.Schema<iComment>({
    comment: {
        type: String,
        required:true,
    },
    sender: {
        type: String,
        required:true,
    },
    postId: {
        type: String,
        required: true,
    },
    profilePic: {  // ✅ Store profile picture
        type: String,
        default: "", 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const commentModel = mongoose.model<iComment>("Comment", commentSchema);

export default commentModel;