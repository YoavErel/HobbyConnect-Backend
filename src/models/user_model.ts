import mongoose from "mongoose";

export interface iUser {
  email: string;
  password: string;
  _id?: string;
  refreshTokens?: string[];
  imgUrl?: string;
  name: string;
  bio?: string;
}

const userSchema = new mongoose.Schema<iUser>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    // required: true,
  },
  imgUrl: {
    type: String,
  },
  name: {
    type: String,
  },
  bio: {
    type: String,
  },
  refreshTokens: {
    type: [String],
    default: [],
  },
});

const userModel = mongoose.model<iUser>("users", userSchema);

export default userModel;
