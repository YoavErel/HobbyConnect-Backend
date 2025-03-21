import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import postModel from "../models/posts_model";
import { Express } from "express";
import userModel from "../models/user_model";

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await userModel.deleteMany();
  await postModel.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close();
});

const baseUrl = "/auth";

type User = {
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
  _id?: string;
};
const testUser: User = {
  email: "user1@test.com",
  password: "123456",
};

describe("Auth test suite", () => {
  test("Auth test registration ", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).toBe(200);
  });

  test("Auth test registration no password", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send({
        email: "serdtfygh",
      });
    expect(response.statusCode).not.toBe(200);
  });

  test("Auth test registration email already exist", async () => {
    const response = await request(app)
      .post(baseUrl + "/register")
      .send(testUser);
    expect(response.statusCode).not.toBe(200);
  });

  test("Auth test login", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;
    testUser.accessToken = accessToken;
    testUser.refreshToken = refreshToken;
    testUser._id = response.body._id;
  });

  test("Auth test login mke sure tokens are different", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;
    expect(accessToken).not.toBe(testUser.accessToken);
    expect(refreshToken).not.toBe(testUser.refreshToken);
    testUser.accessToken = accessToken;
    testUser.refreshToken = refreshToken;
    testUser._id = response.body._id;
  });

  test("Auth test login fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send({
        email: " ",
        password: " ",
      });
    expect(response.statusCode).not.toBe(200);
  });

  test("Auth test incorrect password", async () => {
    const response = await request(app).post("/auth/login").send({
      email: "user1@test.com",
      password: "wrongpassword", // Incorrect password
    });
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe("incorrect email or password");
  });

  test("Tests token access", async () => {
    const response = await request(app).post("/posts").send({
      title: "Test title",
      content: "Test content",
      sender: "test",
    });
    expect(response.statusCode).not.toBe(201);
    const Response2 = await request(app)
      .post("/posts")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: "Test title",
        content: "Test content",
        sender: "user1@test.com",
      });
    expect(Response2.statusCode).toBe(201);
  });

  test("Test token accses fail", async () => {
    const response2 = await request(app)
      .post("/posts")
      .set({
        authorization: "JWT" + testUser.accessToken + "f",
      })
      .send({
        title: "Test title",
        content: "TEst content",
        sender: "user1@test.com",
      });
    expect(response2.statusCode).not.toBe(201);
  });

  test("Test refresh token", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;
  });

  test("Test refresh token fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response.statusCode).toBe(200);
    const newRefreshToken = response.body.refreshToken;

    const response2 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response2.statusCode).not.toBe(200);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: newRefreshToken,
      });
    expect(response3.statusCode).not.toBe(200);
  });

  test("Test logout", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    const accessToken = response.body.accessToken;
    const refreshToken = response.body.refreshToken;
    testUser.accessToken = accessToken;
    testUser.refreshToken = refreshToken;

    const response2 = await request(app)
      .post(baseUrl + "/logout")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response2.statusCode).toBe(200);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response3.statusCode).not.toBe(200);
  });

  test("Test logout fail", async () => {
    const response = await request(app)
      .post(baseUrl + "/logout")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response.statusCode).not.toBe(200);
  });

  jest.setTimeout(20000);

  test("Token expiration", async () => {
    const response = await request(app)
      .post(baseUrl + "/login")
      .send(testUser);
    expect(response.statusCode).toBe(200);
    testUser.accessToken = response.body.accessToken;
    testUser.refreshToken = response.body.refreshToken;

    await new Promise((resolve) => setTimeout(resolve, 12000));

    const response2 = await request(app)
      .post("/posts")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: "Test title",
        content: "Test content",
        sender: "user@test.com",
      });
    expect(response2.statusCode).not.toBe(201);

    const response3 = await request(app)
      .post(baseUrl + "/refresh")
      .send({
        refreshToken: testUser.refreshToken,
      });
    expect(response3.statusCode).toBe(200);
    testUser.accessToken = response3.body.accessToken;
    testUser.refreshToken = response3.body.refreshToken;

    const response4 = await request(app)
      .post("/posts")
      .set({
        authorization: "JWT " + testUser.accessToken,
      })
      .send({
        title: "Test title",
        content: "Test content",
        sender: "user1@test.com",
      });
    expect(response4.statusCode).toBe(201);
  });
});

describe("User by Email Route Tests", () => {
  beforeEach(async () => {
    // Create test users for this test suite
    // First ensure the user doesn't already exist
    await userModel.deleteOne({ email: "test.user@example.com" });
    await userModel.deleteOne({ email: "complex+user@example.com" });
    await userModel.deleteOne({ email: "user.name+tag@example.co.uk" });

    // Create test users
    await userModel.create({
      email: "test.user@example.com",
      password: "password123",
      name: "Test User",
      imgUrl: "https://example.com/profile.jpg",
    });
  });

  test("should successfully retrieve user by email", async () => {
    const email = "test.user@example.com";
    const encodedEmail = encodeURIComponent(email);

    const response = await request(app).get(
      `${baseUrl}/user-by-email/${encodedEmail}`
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("name", "Test User");
    expect(response.body).toHaveProperty("email", email);
    expect(response.body).toHaveProperty(
      "profilePic",
      "https://example.com/profile.jpg"
    );
  });

  test("should handle URL-encoded email addresses", async () => {
    const email = "complex+user@example.com";

    // Create this user
    await userModel.create({
      email: email,
      password: "password123",
      name: "Complex User",
      imgUrl: "https://example.com/complex.jpg",
    });

    const encodedEmail = encodeURIComponent(email);

    const response = await request(app).get(
      `${baseUrl}/user-by-email/${encodedEmail}`
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("email", email);
    expect(response.body).toHaveProperty("name", "Complex User");
  });

  test("should return 404 for non-existent user", async () => {
    const nonExistentEmail = "nonexistent@example.com";
    const encodedEmail = encodeURIComponent(nonExistentEmail);

    const response = await request(app).get(
      `${baseUrl}/user-by-email/${encodedEmail}`
    );

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("message", "User not found");
  });

  test("should return 404 for empty email parameter", async () => {
    const response = await request(app).get(`${baseUrl}/user-by-email/%20`);

    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty("message", "User not found");
  });

  test("should handle email with special characters", async () => {
    const specialEmail = "user.name+tag@example.co.uk";

    // Create this user
    await userModel.create({
      email: specialEmail,
      password: "password123",
      name: "Special User",
      imgUrl: "",
    });

    const encodedEmail = encodeURIComponent(specialEmail);

    const response = await request(app).get(
      `${baseUrl}/user-by-email/${encodedEmail}`
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("email", specialEmail);
    expect(response.body).toHaveProperty("profilePic", ""); // Testing empty imgUrl case
  });

  test("should handle server errors", async () => {
    // Mock a database error by temporarily replacing the findOne method
    const originalFindOne = userModel.findOne;
    // @ts-ignore - TypeScript doesn't like us messing with the implementation
    userModel.findOne = jest.fn().mockImplementationOnce(() => {
      throw new Error("Database connection error");
    });

    const email = "test.user@example.com";
    const encodedEmail = encodeURIComponent(email);

    const response = await request(app).get(
      `${baseUrl}/user-by-email/${encodedEmail}`
    );

    // Restore the original method
    // @ts-ignore - TypeScript doesn't like us messing with the implementation
    userModel.findOne = originalFindOne;

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty(
      "message",
      "Server error while fetching user"
    );
  });
});
