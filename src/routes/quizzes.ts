import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import db from "../db/db";

const quizzesRouter = Router();

// GET /quizzes — returns all quizzes without questions
quizzesRouter.get("/quizzes", authenticate, async (req: Request, res: Response) => {
    try {
        const quizzes = await db("quizzes")
            .select("id", "title");
        res.json(quizzes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch quizzes" });
    }
});

// GET /quizzes/:id — returns a single quiz with its questions
quizzesRouter.get("/quizzes/:id", authenticate, async (req: Request, res: Response) => {
    const quizId = Number(req.params.id);
    try {
        const quiz = await db("quizzes")
            .where({ id: quizId })
            .first("id", "title");

        if (!quiz) {
            res.status(404).json({ message: "Quiz not found" });
            return;
        }

        const questions = await db("questions")
            .where({ quiz_id: quizId })
            .orderBy("id", "asc")
            .select("id", "text", "options", "correct_index");

        res.json({
            ...quiz,
            questions: questions.map((q) => ({
                id: q.id,
                text: q.text,
                options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
                correctIndex: q.correct_index,
            })),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch quiz" });
    }
});

export default quizzesRouter;
