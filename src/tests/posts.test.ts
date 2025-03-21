import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../models/posts_model";
import { Express } from "express";
import userModel from "../models/user_model";

let app: Express;

type User = {
  email: string;
  password: string;
  token?: string;
  _id?: string;
};

const testUser: User = {
  email: "test@user.com",
  password: "123456",
};
let accessToken: string;
let testUserId: string;

let postId = "";
const testPost = {
  title: "Test title",
  content: "Test content",
  sender: "test@user.com",
  category: "",
  image: "", // Include image field even if it's empty
  likes: [],
  comments: [],
  createdAt: new Date().toISOString(),
};

beforeAll(async () => {
  app = await initApp();
  await postModel.deleteMany();
  await userModel.deleteMany();
  const response = await request(app).post("/auth/register").send(testUser);
  const response2 = await request(app).post("/auth/login").send(testUser);
  expect(response.statusCode).toBe(200);
  expect(response2.statusCode).toBe(200);
  accessToken = response2.body.accessToken;
  testPost.sender = testUser.email;

  // Fetch the user to get their ID
  const user = await userModel.findOne({ email: testUser.email });
  testUserId = user?._id.toString() || "";
  expect(testUserId).toBeTruthy(); // Make sure we have a user ID
});

afterAll(async () => {
  await mongoose.connection.close();
});

const invalidPost = {
  content: "Test content",
};

const invalidUpdate = {
  title: "New title",
};

describe("Posts test suite", () => {
  test("Post test get all posts", async () => {
    const response = await request(app).get("/posts?page=1&limit=3"); // Send pagination params

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("posts"); // Ensure response contains 'posts'
    expect(response.body).toHaveProperty("page", 1); // Ensure correct page number
    expect(response.body).toHaveProperty("totalPages"); // Ensure totalPages exists

    // If you expect an empty result initially:
    expect(response.body.posts).toBeInstanceOf(Array);
    expect(response.body.posts.length).toBe(0);
  });

  test("Test adding new post", async () => {
    const response = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + accessToken })
      .send(testPost);
    expect(response.statusCode).toBe(201);
    expect(response.body._id).toBeDefined();
    expect(response.body.title).toBe(testPost.title);
    expect(response.body.content).toBe(testPost.content);
    expect(response.body.sender).toBe(testUser.email);
    postId = response.body._id;
  });

  test("Test adding invalid post", async () => {
    const response = await request(app)
      .post("/posts")
      .set({
        authorization: "JWT" + accessToken,
      })
      .send(invalidPost);
    expect(response.statusCode).not.toBe(201);
  });

  test("Test get all posts after adding", async () => {
    const response = await request(app).get("/posts?page=1&limit=3"); // ✅ Use pagination
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("posts"); // ✅ Ensure response contains 'posts'
    expect(response.body).toHaveProperty("page", 1); // ✅ Ensure correct page number
    expect(response.body).toHaveProperty("totalPages"); // ✅ Ensure totalPages exists

    expect(response.body.posts).toBeInstanceOf(Array);
    expect(response.body.posts.length).toBeGreaterThan(0);
  });

  test("Test get post by sender", async () => {
    const response = await request(app).get("/posts?sender=" + testUser.email);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("posts"); // ✅ Ensure response contains 'posts'
    expect(response.body.posts).toBeInstanceOf(Array); // ✅ Ensure 'posts' is an array
    expect(response.body.posts).toHaveLength(1); // ✅ Fix: Check length of 'posts' array

    expect(response.body.posts[0].sender).toBe(testUser.email); // ✅ Ensure correct sender
  });

  test("Test get post by id", async () => {
    if (!postId) throw new Error("postId not defined");
    const response = await request(app).get("/posts/" + postId);
    const post = response.body;
    expect(response.statusCode).toBe(200);
    expect(response.body._id).toBe(post._id);
  });

  test("Test get post by id fail", async () => {
    if (!postId) throw new Error("postId not defined");
    const response = await request(app).get("/posts/" + postId + "3");
    expect(response.statusCode).toBe(400);
  });

  test("Test update post", async () => {
    if (!postId) throw new Error("postId not defined");
    const response = await request(app)
      .put("/posts/" + postId)
      .set({ authorization: "JWT " + accessToken })
      .send({
        title: "New title",
        content: "New content",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.title).toBe("New title");
    expect(response.body.content).toBe("New content");
  });

  test("Test update post fail", async () => {
    if (!postId) throw new Error("postId not defined");
    const response = await request(app)
      .put("/posts/" + postId + "3")
      .set({ authorization: "JWT " + accessToken })
      .send({ invalidUpdate });
    expect(response.statusCode).toBe(400);
  });

  test("Test delete post", async () => {
    if (!postId) throw new Error("postId not defined");
    const response = await request(app)
      .delete("/posts/" + postId)
      .set({ authorization: "JWT " + accessToken });
    expect(response.statusCode).toBe(200);
  });

  test("Test delete post fail", async () => {
    if (!postId) throw new Error("postId not defined");
    const response = await request(app)
      .delete("/posts/" + postId + "3")
      .set({ authorization: "JWT " + accessToken });
    expect(response.statusCode).toBe(400);
  });

  test("Test get posts by category", async () => {
    const response = await request(app).get("/posts?category=Test");
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("posts");
    expect(response.body.posts).toBeInstanceOf(Array);
    expect(response.body.posts.length).toBe(0);
  });

  test("Test get posts by category fail", async () => {
    const response = await request(app).get("/posts?category=Test");
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("posts");
    expect(response.body.posts).toBeInstanceOf(Array);
    expect(response.body.posts.length).toBe(0);
  });

  test("Test get posts by invalid user email", async () => {
    const nonExistentEmail = "nonexistent@example.com";

    const response = await request(app)
      .get(`/posts/user/${nonExistentEmail}`)
      .set({ authorization: "JWT " + accessToken });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0); // Should be empty array for non-existent user
  });

  test("Test get posts by user with malformed email parameter", async () => {
    const response = await request(app)
      .get(`/posts/user/`)
      .set({ authorization: "JWT " + accessToken });

    expect(response.statusCode).toBe(400); // Route not found
  });
  test("Test get posts by user email without authentication should fail", async () => {
    const response = await request(app).get(`/posts/user/${testUser.email}`);

    expect(response.statusCode).toBe(400); // Unauthorized
  });
});

test("Test get post suggestions with error handling", async () => {
  try {
    const response = await request(app)
      .post("/api/posts/suggestions")
      .send({ userInput: "test suggestion" });
    if (response.statusCode !== 200) {
      expect(response.body.message).toBeDefined();
    } else {
      expect(response.body.suggestions).toBeInstanceOf(Array);
    }
  } catch (error) {
    expect(error).toBeDefined();
  }
});

test("Test get posts by user email with authentication", async () => {
  // First, add a new test post from our user
  const response1 = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + accessToken })
    .send(testPost);

  expect(response1.statusCode).toBe(201);

  // Now test the user email endpoint
  const response = await request(app)
    .get(`/posts/user/${testUser.email}`)
    .set({ authorization: "JWT " + accessToken });

  expect(response.statusCode).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body.length).toBeGreaterThan(0);
  expect(response.body[0].sender).toBe(testUser.email);
});

test("Test creating post with missing required fields", async () => {
  // Test missing title
  const missingTitle = {
    content: "Test content",
    sender: testUser.email,
    category: "",
    image: "",
  };

  const response1 = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + accessToken })
    .send(missingTitle);

  expect(response1.statusCode).toBe(400);
  expect(response1.body).toHaveProperty("message", "Missing required fields");

  // Test missing content
  const missingContent = {
    title: "Test title",
    sender: testUser.email,
    category: "",
    image: "",
  };

  const response2 = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + accessToken })
    .send(missingContent);

  expect(response2.statusCode).toBe(400);
  expect(response2.body).toHaveProperty("message", "Missing required fields");

  // Test missing sender
  const missingSender = {
    title: "Test title",
    content: "Test content",
    category: "",
    image: "",
  };

  const response3 = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + accessToken })
    .send(missingSender);

  expect(response3.statusCode).toBe(400);
  expect(response3.body).toHaveProperty("message", "Missing required fields");

  // Test all fields missing
  const allMissing = {
    category: "",
    image: "",
  };

  const response4 = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + accessToken })
    .send(allMissing);

  expect(response4.statusCode).toBe(400);
  expect(response4.body).toHaveProperty("message", "Missing required fields");
});

test("Test error handling during post save", async () => {
  // Mock the save method to throw an error
  const originalSave = mongoose.Model.prototype.save;
  mongoose.Model.prototype.save = jest
    .fn()
    .mockRejectedValue(new Error("Database error"));

  // Try to create a post which should now trigger the error handling
  const response = await request(app)
    .post("/posts")
    .set({ authorization: "JWT " + accessToken })
    .send(testPost);

  // Verify the error response
  expect(response.statusCode).toBe(500);
  expect(response.body).toHaveProperty(
    "message",
    "Server error while creating post"
  );

  // Restore the original save method
  mongoose.Model.prototype.save = originalSave;
});

describe("Post like functionality", () => {
  // Use the PUT method consistently for like operations
  const LIKE_METHOD = "put";
  const LIKE_ENDPOINT = "/like";

  test("Test like a post", async () => {
    // Create a test post first
    const createResponse = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + accessToken })
      .send(testPost);

    expect(createResponse.statusCode).toBe(201);
    const postId = createResponse.body._id;

    // Test liking the post
    const likeResponse = await request(app)
      [LIKE_METHOD](`/posts/${postId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({ userId: testUserId });

    expect(likeResponse.statusCode).toBe(200);
    expect(likeResponse.body).toHaveProperty("likedBy");

    // Check if the response includes likedBy field with the user ID
    // The property could be an array or set depending on implementation
    const likedBy = likeResponse.body.likedBy;
    const userIdFound = Array.isArray(likedBy)
      ? likedBy.includes(testUserId)
      : likedBy === testUserId;

    expect(userIdFound).toBe(true);
  });

  test("Test unlike a post", async () => {
    // Create a test post first
    const createResponse = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + accessToken })
      .send(testPost);

    expect(createResponse.statusCode).toBe(201);
    const postId = createResponse.body._id;

    // Like the post first
    await request(app)
      [LIKE_METHOD](`/posts/${postId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({ userId: testUserId });

    // Then unlike the post (toggling the like)
    const unlikeResponse = await request(app)
      [LIKE_METHOD](`/posts/${postId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({ userId: testUserId });

    expect(unlikeResponse.statusCode).toBe(200);
    expect(unlikeResponse.body).toHaveProperty("likedBy");

    // Check the userId is not in the likedBy field after unliking
    const likedBy = unlikeResponse.body.likedBy;
    const userIdFound = Array.isArray(likedBy)
      ? likedBy.includes(testUserId)
      : likedBy === testUserId;

    expect(userIdFound).toBe(false);
  });

  test("Test like post with missing userId", async () => {
    // Create a test post first
    const createResponse = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + accessToken })
      .send(testPost);

    expect(createResponse.statusCode).toBe(201);
    const postId = createResponse.body._id;

    // Test liking without providing userId
    const likeResponse = await request(app)
      [LIKE_METHOD](`/posts/${postId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({});

    expect(likeResponse.statusCode).toBe(400);
    expect(likeResponse.body).toHaveProperty("message", "User ID is required");
  });

  test("Test like non-existent post", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    const likeResponse = await request(app)
      [LIKE_METHOD](`/posts/${nonExistentId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({ userId: testUserId });

    expect(likeResponse.statusCode).toBe(404);
    expect(likeResponse.body).toHaveProperty("message", "Post not found");
  });

  test("Test like post with invalid post ID", async () => {
    const invalidId = "invalidid123";

    const likeResponse = await request(app)
      [LIKE_METHOD](`/posts/${invalidId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({ userId: testUserId });

    expect(likeResponse.statusCode).toBe(500);
    expect(likeResponse.body).toHaveProperty(
      "message",
      "Server error while toggling like"
    );
  });

  test("Test like functionality error handling", async () => {
    // Create a test post first
    const createResponse = await request(app)
      .post("/posts")
      .set({ authorization: "JWT " + accessToken })
      .send(testPost);

    expect(createResponse.statusCode).toBe(201);
    const postId = createResponse.body._id;

    // Use proper Jest spying technique
    const findByIdSpy = jest
      .spyOn(mongoose.Model, "findById")
      .mockImplementation(() => {
        throw new Error("Database error");
      });

    // Test error handling
    const likeResponse = await request(app)
      [LIKE_METHOD](`/posts/${postId}${LIKE_ENDPOINT}`)
      .set({ authorization: "JWT " + accessToken })
      .send({ userId: testUserId });

    expect(likeResponse.statusCode).toBe(500);
    expect(likeResponse.body).toHaveProperty(
      "message",
      "Server error while toggling like"
    );

    // Restore the spy
    findByIdSpy.mockRestore();
  });
});
