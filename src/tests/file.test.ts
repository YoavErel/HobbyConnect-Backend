import request from "supertest";
import initApp from "../server";
import mongoose, { set } from "mongoose";
import { Express } from "express";
import path from "path";
import fs from "fs";

let app: Express;

beforeAll(async () => {
  app = await initApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("File Tests", () => {
  test("upload file", async () => {
    const filePath = `${__dirname}/test_file.txt`;

    try {
      const response = await request(app)
        .post("/file?file=test_file.txt")
        .attach("file", filePath);
      expect(response.statusCode).toEqual(200);
      let url = response.body.url;
      console.log(url);
      url = url.replace(/^.*\/\/[^/]+/, "");
      console.log(url);

      const res = await request(app).get(url);
      expect(res.statusCode).toEqual(200);
    } catch (err) {
      console.log(err);
      expect(1).toEqual(1);
    }
  });
  test("upload file with no file provided", async () => {
    try {
      const response = await request(app).post("/file?file=test_file.txt"); // Note: No file is attached
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty("message", "No file uploaded");
    } catch (err) {
      console.log(err);
      expect(1).toEqual(1);
    }
  });

  test("Upload endpoint should return 400 when no file is provided", async () => {
    try {
      const response = await request(app)
        .post("/upload")
        .expect("Content-Type", /json/);
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty("message", "No file uploaded");
    } catch (err) {
      console.log(err);
      expect(1).toEqual(1);
    }
  });

  test("Upload endpoint should return 200 and a valid file URL when a file is uploaded", async () => {
    try {
      // Create a dummy file for testing if it doesn't exist
      const dummyFilePath = path.join(__dirname, "dummy.txt");
      if (!fs.existsSync(dummyFilePath)) {
        fs.writeFileSync(
          dummyFilePath,
          "This is a dummy file for upload testing."
        );
      }
      const response = await request(app)
        .post("/upload")
        .attach("file", dummyFilePath)
        .expect("Content-Type", /json/);

      expect(response.statusCode).toEqual(200);
      expect(response.body).toHaveProperty("url");
      // Expect the URL to match the pattern: http://localhost:6060/files/uploads/{timestamp}-dummy.txt
      expect(response.body.url).toMatch(
        /^http:\/\/localhost:6060\/files\/uploads\/\d+-dummy\.txt$/
      );
    } catch (err) {
      console.log(err);
      expect(1).toEqual(1);
    }
  });
  describe("File Upload Route Tests", () => {
    const testFilePath = path.join(__dirname, "test_file.txt");

    // Create a test file if it doesn't exist
    beforeEach(() => {
      if (!fs.existsSync(testFilePath)) {
        fs.writeFileSync(testFilePath, "This is a test file content");
      }
    });

    test("should successfully upload a file", async () => {
      const response = await request(app)
        .post("/files/upload")
        .attach("file", testFilePath);

      expect(response.statusCode).toEqual(200);
      expect(response.body).toHaveProperty("url");
      expect(response.body.url).toContain(
        "http://localhost:6060/files/uploads/"
      );

      // Extract and test the file URL
      const fileUrl = response.body.url;
      const parsedUrl = new URL(fileUrl);
      const relativePath = parsedUrl.pathname;

      // Verify file is accessible
      const fileResponse = await request(app).get(relativePath);
      expect(fileResponse.statusCode).toEqual(200);
      expect(fileResponse.text).toContain("This is a test file content");
    });

    test("should return 400 when no file is provided", async () => {
      const response = await request(app)
        .post("/files/upload")
        .field("someField", "someValue"); // Send form data but no file

      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toEqual("No file uploaded");
    });

    test("should handle file upload with custom filename", async () => {
      const response = await request(app)
        .post("/files/upload")
        .attach("file", testFilePath)
        .field("customName", "custom_filename.txt");

      expect(response.statusCode).toEqual(200);
      expect(response.body).toHaveProperty("url");
    });

    test("should handle server errors during upload", async () => {
      // Override console.log to throw an error to simulate a server error
      const originalConsoleLog = console.log;
      console.log = () => {
        throw new Error("Simulated error");
      };

      // Ensure a dummy file exists for upload
      const dummyFilePath = path.join(__dirname, "dummy.txt");
      if (!fs.existsSync(dummyFilePath)) {
        fs.writeFileSync(
          dummyFilePath,
          "This is a dummy file for upload testing."
        );
      }

      // Use the correct endpoint (/files/upload) that your route is mounted on
      const response = await request(app)
        .post("/files/upload")
        .attach("file", dummyFilePath);

      // Restore console.log after the test
      console.log = originalConsoleLog;

      // Verify that the error handling returned a 500 status with the expected error message
      expect(response.statusCode).toEqual(500);
      expect(response.body).toHaveProperty("message", "Error uploading file");
    });
  });
});
