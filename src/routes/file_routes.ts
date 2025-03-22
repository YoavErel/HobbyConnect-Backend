import express, { Request, Response } from "express";
const router = express.Router();
import multer from "multer";
import path from "path";
import fs from "fs";

const base = process.env.DOMAIN_BASE + "/";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads"); // Correct path
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload a file
 *     description: Uploads a file to the server
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL of the uploaded file
 *       '400':
 *         description: No file uploaded
 *       '500':
 *         description: Error uploading file
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Upload request received:", req.file);

      if (!req.file) {
        console.log("No file received.");
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const fileUrl = `http://node49.cs.colman.ac.il/files/uploads/${req.file.filename}`; // Ensure correct URL
      console.log("File uploaded:", fileUrl);

      res.status(200).json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Error uploading file" });
    }
  }
);

/**
 * @swagger
 * /files/uploads/{filename}:
 *   get:
 *     summary: Serve static files
 *     description: Serves static files from the uploads directory
 *     tags:
 *       - Files
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the file to serve
 *     responses:
 *       '200':
 *         description: File served successfully
 *       '404':
 *         description: File not found
 */
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

export default router;
