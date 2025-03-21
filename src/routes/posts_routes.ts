import express, { Request, Response } from "express";
const router = express.Router();
import postController from "../controllers/post_controller";
import { authMiddleware } from "../controllers/auth_controller";
import postModel from "../models/posts_model";

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: The Posts API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         sender:
 *           type: string
 *       example:
 *         title: "Sample Post"
 *         content: "This is a sample post content."
 *         sender: "bob@gmail.com"
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Retrieves all posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: A list of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 */
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 3, category } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build a filter object
    const filter: any = {};
    if (category) {
      filter.category = category;
    }

    const posts = await postModel
      .find(filter)
      .populate("sender", "name email profilePic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPosts = await postModel.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limitNum);

    res.status(200).json({ posts, page: pageNum, totalPages });
  } catch (error) {
    console.error("Error fetching paginated posts:", error);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Retrieves a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The post ID
 *     responses:
 *       200:
 *         description: A single post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 */
router.get("/:id", (req, res) => {
  postController.getById(req, res);
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Creates a new post
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       '201':
 *         description: The created post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       '400':
 *         description: Invalid input
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Internal server error
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  console.log("📥 Incoming POST request to create a post.");
  console.log("🔍 Request Body:", req.body);
  console.log("🔍 User from Middleware:", (req as any).user);

  try {
    await postController.createItem(req, res);
  } catch (error) {
    console.error("🛑 Error in router while creating post:", error);
    res
      .status(500)
      .json({ message: "Internal server error in post creation." });
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update an existing post
 *     description: Updates an existing post by ID
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Post'
 *     responses:
 *       '200':
 *         description: The updated post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       '400':
 *         description: Invalid input
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Post not found
 *       '500':
 *         description: Internal server error
 */
router.put("/:id", async (req: Request, res: Response) => {
  await postController.updateItem(req, res);
});

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     description: Deletes a post by its ID
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       '200':
 *         description: Post deleted successfully
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Post not found
 *       '500':
 *         description: Internal server error
 */
router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    await postModel.findByIdAndDelete(postId);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting post" });
  }
});
/**
 * @swagger
 * /posts/user/{email}:
 *   get:
 *     summary: Get posts by user email
 *     description: Retrieves posts created by a specific user based on their email
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: The email of the user
 *     responses:
 *       '200':
 *         description: A list of posts created by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       '400':
 *         description: User email is required
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Server error while fetching user posts
 */
router.get(
  "/user/:email",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userEmail = req.params.email; // ✅ Use params, not query
      console.log("📩 Received user email:", userEmail); // ✅ Log received email

      if (!userEmail) {
        res.status(400).json({ message: "User email is required" });
        return;
      }

      const userPosts = await postModel
        .find({ sender: userEmail })
        .populate("comments")
        .sort({ createdAt: -1 });

      console.log("✅ Retrieved posts:", userPosts);
      res.status(200).json(userPosts);
    } catch (error) {
      console.error("❌ Error fetching user posts:", error);
      res
        .status(500)
        .json({ message: "Server error while fetching user posts" });
    }
  }
);

/**
 * @swagger
 * /posts/{id}/like:
 *   put:
 *     summary: Like or Unlike a post
 *     description: Toggles the like status of a post by ID
 *     tags:
 *       - Posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID
 *     responses:
 *       '200':
 *         description: The updated like status of the post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 liked:
 *                   type: boolean
 *                   description: Whether the post is liked or not
 *       '400':
 *         description: Invalid input
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Post not found
 *       '500':
 *         description: Internal server error
 */
router.put("/:id/like", postController.toggleLike); // ✅ Like/Unlike route

router.post("/suggestions", postController.getPostSuggestions);

export default router;
