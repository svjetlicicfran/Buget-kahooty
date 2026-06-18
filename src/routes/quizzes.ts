import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import db from "../db/db";

const quizzesRouter = Router();

type QuestionInput = {
    text: string;
    options: string[];
    correctIndex: number;
};

function validateQuizPayload(title: unknown, questions: unknown): { valid: boolean; message?: string; parsedQuestions?: QuestionInput[] } {
    if (typeof title !== "string" || title.trim().length === 0) {
        return { valid: false, message: "Title is required" };
    }

    if (!Array.isArray(questions) || questions.length === 0) {
        return { valid: false, message: "At least one question is required" };
    }

    for (const q of questions) {
        const question = q as Partial<QuestionInput>;
        if (typeof question.text !== "string" || question.text.trim().length === 0) {
            return { valid: false, message: "Each question must have text" };
        }
        if (!Array.isArray(question.options) || question.options.length < 2) {
            return { valid: false, message: "Each question must have at least 2 options" };
        }
        if (typeof question.correctIndex !== "number") {
            return { valid: false, message: "Each question must have correctIndex" };
        }
        if (question.correctIndex < 0 || question.correctIndex >= question.options.length) {
            return { valid: false, message: "correctIndex is out of range" };
        }
    }

    return { valid: true, parsedQuestions: questions as QuestionInput[] };
}

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

// POST /quizzes — admin creates a quiz with questions
quizzesRouter.post("/quizzes", authenticate, requireAdmin, async (req: Request, res: Response) => {
    const { title, questions } = req.body;
    const validation = validateQuizPayload(title, questions);

    if (!validation.valid || !validation.parsedQuestions) {
        res.status(400).json({ message: validation.message });
        return;
    }
    const parsedQuestions = validation.parsedQuestions;

    try {
        const quizId = await db.transaction(async (trx) => {
            const insertedQuiz = await trx("quizzes").insert({ title: title.trim() });
            const newQuizId = Array.isArray(insertedQuiz) ? Number(insertedQuiz[0]) : Number(insertedQuiz);

            const questionRows = parsedQuestions.map((q) => ({
                quiz_id: newQuizId,
                text: q.text,
                options: JSON.stringify(q.options),
                correct_index: q.correctIndex,
            }));

            await trx("questions").insert(questionRows);
            return newQuizId;
        });

        res.status(201).json({ id: quizId, message: "Quiz created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create quiz" });
    }
});

// PUT /quizzes/:id — admin updates quiz and replaces its questions
quizzesRouter.put("/quizzes/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
    const quizId = Number(req.params.id);
    const { title, questions } = req.body;
    const validation = validateQuizPayload(title, questions);

    if (Number.isNaN(quizId)) {
        res.status(400).json({ message: "Invalid quiz id" });
        return;
    }

    if (!validation.valid || !validation.parsedQuestions) {
        res.status(400).json({ message: validation.message });
        return;
    }
    const parsedQuestions = validation.parsedQuestions;

    try {
        const updated = await db.transaction(async (trx) => {
            const existingQuiz = await trx("quizzes").where({ id: quizId }).first("id");
            if (!existingQuiz) {
                return false;
            }

            await trx("quizzes").where({ id: quizId }).update({ title: title.trim() });
            await trx("questions").where({ quiz_id: quizId }).del();

            const questionRows = parsedQuestions.map((q) => ({
                quiz_id: quizId,
                text: q.text,
                options: JSON.stringify(q.options),
                correct_index: q.correctIndex,
            }));
            await trx("questions").insert(questionRows);
            return true;
        });

        if (!updated) {
            res.status(404).json({ message: "Quiz not found" });
            return;
        }

        res.json({ message: "Quiz updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update quiz" });
    }
});

// DELETE /quizzes/:id — admin deletes a quiz and its questions
quizzesRouter.delete("/quizzes/:id", authenticate, requireAdmin, async (req: Request, res: Response) => {
    const quizId = Number(req.params.id);

    if (Number.isNaN(quizId)) {
        res.status(400).json({ message: "Invalid quiz id" });
        return;
    }

    try {
        const deleted = await db.transaction(async (trx) => {
            const existingQuiz = await trx("quizzes").where({ id: quizId }).first("id");
            if (!existingQuiz) {
                return false;
            }

            await trx("questions").where({ quiz_id: quizId }).del();
            await trx("quizzes").where({ id: quizId }).del();
            return true;
        });

        if (!deleted) {
            res.status(404).json({ message: "Quiz not found" });
            return;
        }

        res.json({ message: "Quiz deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete quiz" });
    }
});

export default quizzesRouter;
