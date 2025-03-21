import { Credentials } from "./../../node_modules/google-auth-library/build/src/auth/credentials.d";
import { Request, Response, NextFunction } from "express";
import userModel, { iUser } from "../models/user_model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Document } from "mongoose";
import { OAuth2Client } from "google-auth-library";

const register = async (req: Request, res: Response) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    let imgUrl = req.body.imgUrl;
    if (!imgUrl) imgUrl = null;
    if (!email || !password) {
      res.status(400).send("missing email or password");
      return;
    }
    const user = await userModel.create({
      email: req.body.email,
      password: hashedPassword,
      imgUrl: imgUrl,
      name: req.body.name,
    });
    console.log(user);
    res.status(200).send(user);
  } catch (err) {
    res.status(400).send(err);
  }
};

const generateTokens = (
  user: iUser
): { refreshToken: string; accessToken: string } | null => {
  if (process.env.TOKEN_SECRET === undefined) {
    return null;
  }
  const rand = Math.random();
  const accessToken = jwt.sign(
    {
      _id: user._id,
      rand: rand,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRATION }
  );
  const refreshToken = jwt.sign(
    {
      _id: user._id,
      rand: rand,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
  );
  return { refreshToken: refreshToken, accessToken: accessToken };
};

const login = async (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await userModel.findOne({ email: email });
    if (!user) {
      res.status(400).send("incorrect email or password");
      return;
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(400).send("incorrect email or password");
      return;
    }
    const tokens = generateTokens(user);
    if (!tokens) {
      res.status(400).send("error");
      return;
    }
    if (user.refreshTokens == undefined) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(tokens.refreshToken);
    user.save();
    res.status(200).send({
      ...tokens,
      _id: user._id,
    });
  } catch (err) {
    res.status(400).send(err);
  }
};

const validateRefreshToken = (refreshToken: string | undefined) => {
  return new Promise<Document<unknown, {}, iUser> & iUser>(
    (resolve, reject) => {
      if (refreshToken == null) {
        reject("error");
        return;
      }
      if (!process.env.TOKEN_SECRET) {
        reject("error");
        return;
      }
      jwt.verify(
        refreshToken,
        process.env.TOKEN_SECRET,
        async (err: any, payload: any) => {
          if (err) {
            reject(err);
            return;
          }
          const userId = (payload as Payload)._id;
          try {
            const user = await userModel.findById(userId);
            if (!user) {
              reject("error");
              return;
            }
            //check if token exists
            if (
              !user.refreshTokens ||
              !user.refreshTokens.includes(refreshToken)
            ) {
              user.refreshTokens = [];
              await user.save();
              reject(err);
              return;
            }
            resolve(user);
          } catch (err) {
            reject(err);
          }
        }
      );
    }
  );
};

const logout = async (req: Request, res: Response) => {
  try {
    const user = await validateRefreshToken(req.body.refreshToken);
    if (!user) {
      res.status(400).send("error");
      return;
    }
    //remove the token from the user
    user.refreshTokens = user.refreshTokens!.filter(
      (token) => token !== req.body.refreshToken
    );
    await user.save();
    res.status(200).send("logged out");
  } catch (err) {
    res.status(400).send("error");
    return;
  }
};

const refresh = async (req: Request, res: Response) => {
  try {
    const user = await validateRefreshToken(req.body.refreshToken);

    const tokens = generateTokens(user);
    if (!tokens) {
      res.status(400).send("error");
      return;
    }
    user.refreshTokens = user.refreshTokens!.filter(
      (token) => token !== req.body.refreshToken
    );
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({
      ...tokens,
      _id: user._id,
    });
  } catch (err) {
    res.status(400).send("error");
  }
};

type Payload = {
  _id: string;
};
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tokenHeader = req.headers["authorization"];
  const token = tokenHeader && tokenHeader.split(" ")[1];
  if (!token) {
    res.status(400).send("Access denied");
    return;
  }
  if (process.env.TOKEN_SECRET === undefined) {
    res.status(400).send("server error");
    return;
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    if (err) {
      res.status(400).send("Access denied");
    } else {
      const userId = (payload as Payload)._id;
      req.params.userId = userId;
      next();
    }
  });
};

const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await userModel.findOne({ name: req.body.name });
    console.log(users?.name);
    res.status(200).send(users);
  } catch (err) {
    res.status(400).send;
  }
};

const getbyId = async (req: Request, res: Response) => {
  try {
    const user = await userModel.findById(req.params.id);
    res.status(200).send(user);
  } catch (err) {
    res.status(400).send(err);
  }
};

const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, bio, profilePic } = req.body;

    console.log("📥 Received update request:", { name, bio, profilePic });

    const updatedUser = await userModel.findOneAndUpdate(
      { _id: req.params.id },
      {
        name,
        bio,
        imgUrl: profilePic, // ✅ Ensure `imgUrl` is updated
      },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    console.log("✅ User updated successfully:", updatedUser);
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("🛑 Error updating user:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

const client = new OAuth2Client();
const googleSignin = async (req: Request, res: Response) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.WEB_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (email != null) {
      let user = await userModel.findOne({ email: email });
      if (user == null) {
        user = await userModel.create({
          name: payload?.name,
          email: email,
          password: "",
          imgUrl: payload?.picture,
        });
      }
      const token = await generateTokens(user);
      res.status(200).send({
        email: user.email,
        _id: user._id,
        imgUrl: user.imgUrl,
        ...token,
      });
    }
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(400).send("An unknown error occurred");
    }
  }
};

export default {
  register,
  login,
  refresh,
  logout,
  getUsers,
  getbyId,
  updateItem,
  googleSignin,
};
