import { iComment } from "./../models/comments_model";
import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import commentModel from "../models/comments_model";
import { Express } from "express";
import userModel from "../models/user_model";

let app: Express;

type User = {
  email: string;
  password: string;
  token?: string;
  _id?: string;
  profilePic?: string;
};

const testUser: User = {
  email: "test@user.com",
  password: "123456",
};
let accessToken: string;

const testPost = {
  _id: new mongoose.Types.ObjectId().toString(), // ✅ Generate a unique ID
  title: "Test Post",
  content: "This is a test post",
  sender: testUser.email,
};

const testComment = {
  sender: "test@user.com", // ✅ Ensure valid sender
  postId: testPost._id, // ✅ Ensure postId is valid
  comment: "Test comment", // ✅ Use correct field name
  profilePic: testUser.profilePic || "", // ✅ Optional profilePic
};

const invalidUpdate = {
  comment: "Test comment",
};

beforeAll(async () => {
  app = await initApp();
  console.log("beforeAll");
  await commentModel.deleteMany();
  await userModel.deleteMany();
  const response = await request(app).post("/auth/register").send(testUser);
  const response2 = await request(app).post("/auth/login").send(testUser);
  expect(response.statusCode).toBe(200);
  expect(response2.statusCode).toBe(200);
  accessToken = response2.body.accessToken;
  testComment.sender = response2.body.email;
});

afterAll(async () => {
  console.log("afterAll");
  await mongoose.connection.close();
});

let commentId = "";

const invalidComment = {
  comment: "Test comment",
};

describe("comments test suite", () => {
  test("comment test get all comments", async () => {
    const response = await request(app).get("/comments");
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  test("Test Create Comment", async () => {
    const validComment = {
      sender: testUser.email, // ✅ Ensure valid sender
      postId: testPost._id, // ✅ Ensure postId is valid
      content: "Test comment", // ✅ Use 'content' instead of 'comment'
      profilePic: testUser.profilePic || "", // ✅ Optional profilePic
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`) // ✅ Ensure proper JWT format
      .send(validComment);
    expect(response.statusCode).toBe(201); // ✅ Expect successful creation
    expect(response.body).toHaveProperty("_id"); // ✅ Ensure comment ID exists
    commentId = response.body._id;
    expect(response.body.sender).toBe(validComment.sender);
    expect(response.body.postId).toBe(validComment.postId);
    expect(response.body.comment).toBe(validComment.content); // ✅ Ensure content matches
    expect(response.body.profilePic).toBe(validComment.profilePic); // ✅ Ensure profilePic is stored
  });

  test("Test adding invalid comment", async () => {
    const response = await request(app).post("/comments").send(invalidComment);
    expect(response.statusCode).not.toBe(201);
  });

  test("Test getting all comments after adding", async () => {
    const response = await request(app).get("/comments");
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  test("Test get comment by sender", async () => {
    const response = await request(app).get(
      "/comments?senderr=" + testComment.sender
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].owner).toBe(testComment.sender);
  });

  test("Test get comment by id", async () => {
    const response = await request(app).get("/comments/" + commentId);
    const post = response.body;
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(post._id);
  });

  test("Test get comment by id fail", async () => {
    const response = await request(app).get("/comments/" + commentId + "3");
    expect(response.statusCode).toBe(400);
  });

  test("Test update comment", async () => {
    const response = await request(app)
      .put("/comments/" + commentId)
      .set({ authorization: "JWT " + accessToken })
      .send({
        comment: "New comment",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.comment).toBe("New comment");
  });

  test("Test update comment fail", async () => {
    const response = await request(app)
      .put("/comments/" + commentId + 5)
      .set({ authorization: "JWT " + accessToken })
      .send({ invalidUpdate });
    expect(response.statusCode).toBe(400);
  });

  test("Test delete comment", async () => {
    const response = await request(app)
      .delete("/comments/" + commentId)
      .set({ authorization: "JWT " + accessToken });
    expect(response.statusCode).toBe(200);
  });

  test("Test delete comment fail", async () => {
    const response = await request(app)
      .delete("/comment/" + commentId + 3)
      .set({ authorization: "JWT " + accessToken });
    expect(response.statusCode).toBe(404);
  });

  test("Test get comments by postId - success", async () => {
    // Ensure a valid comment is created first
    const validComment = {
      sender: testUser.email,
      postId: testPost._id,
      content: "This is a test comment",
      profilePic: testUser.profilePic || "",
    };

    const createdCommentResponse = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`)
      .send(validComment);

    expect(createdCommentResponse.statusCode).toBe(201);
    const createdComment = createdCommentResponse.body;
    expect(createdComment.postId).toBe(validComment.postId);

    // Now test fetching by postId
    const response = await request(app).get(`/comments/post/${testPost._id}`);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].postId).toBe(testPost._id);
  });

  test("Test get comments by postId - no comments", async () => {
    const response = await request(app).get(`/comments/post/nonexistentPostId`);
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  test("Test get comments by postId - missing postId", async () => {
    const response = await request(app).get("/comments/post/");
    expect(response.statusCode).toBe(400);
  });
  test("Test creating comment without sender - should fail", async () => {
    const missingFieldComment = {
      // sender is missing
      postId: testPost._id,
      content: "Test comment without sender",
      profilePic: "",
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`)
      .send(missingFieldComment);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe("Missing required fields");
  });

  test("Test creating comment without postId - should fail", async () => {
    const missingFieldComment = {
      sender: testUser.email,
      // postId is missing
      content: "Test comment without postId",
      profilePic: "",
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`)
      .send(missingFieldComment);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe("Missing required fields");
  });

  test("Test creating comment without content - should fail", async () => {
    const missingFieldComment = {
      sender: testUser.email,
      postId: testPost._id,
      // content is missing
      profilePic: "",
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`)
      .send(missingFieldComment);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe("Missing required fields");
  });

  test("Test creating comment with empty fields - should fail", async () => {
    const emptyFieldsComment = {
      sender: "",
      postId: "",
      content: "",
      profilePic: "",
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`)
      .send(emptyFieldsComment);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toBe("Missing required fields");
  });

  test("Test creating comment with all required fields - should succeed", async () => {
    const validComment = {
      sender: testUser.email,
      postId: testPost._id,
      content: "This is a valid comment with all required fields",
      profilePic: "",
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", `JWT ${accessToken}`)
      .send(validComment);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.sender).toBe(validComment.sender);
    expect(response.body.postId).toBe(validComment.postId);
    expect(response.body.comment).toBe(validComment.content);
  });
});
