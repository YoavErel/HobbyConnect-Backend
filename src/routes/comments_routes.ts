import express, { Request, Response } from "express";
const router = express.Router();
import commentsController from "../controllers/comment_controller";
import { authMiddleware } from "../controllers/auth_controller";
import commentsModel from "../models/comments_model";

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: The comments API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - sender
 *         - postId
 *         - content
 *       properties:
 *         postId:
 *           type: string
 *           description: The id of the post the comment belongs to
 *         content:
 *           type: string
 *           description: The content of the comment
 *         sender:
 *           type: string
 *           description: The author of the comment
 *       example:
 *         sender: bob@gmail.com
 *         postId: "67dd57f0fc9b27ec788cc3c4"
 *         content: This is a comment
 */

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Get all comments
 *     tags: [Comments]
 *     responses:
 *       200:
 *         description: The list of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get("/", commentsController.getAll.bind(commentsController));

/**
 * @swagger
 * /comments/{id}:
 *   get:
 *     summary: Get a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The comment ID
 *     responses:
 *       200:
 *         description: The comment by ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.get("/:id", (req, res) => {
  commentsController.getById(req, res);
});

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Create a new comment
 *     security:
 *       - bearerAuth: []
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       201:
 *         description: The created comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/", authMiddleware, commentsController.createItem);

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update an existing comment
 *     security:
 *       - bearerAuth: []
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Comment'
 *     responses:
 *       200:
 *         description: The updated comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.put("/:id", authMiddleware, (req: Request, res: Response) => {
  commentsController.updateItem(req, res);
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     security:
 *       - bearerAuth: []
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The comment ID
 *     responses:
 *       200:
 *         description: The comment was deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", async (req, res) => {
  try {
    const commentId = req.params.id;
    await commentsModel.findByIdAndDelete(commentId);
    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting comment" });
  }
});
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
router.get("/post/:postId", (req: Request, res: Response) => {
  commentsController.getCommentsByPostId(req, res);
});

export default router;
