import db from "../db/db";
import { Question } from "../models/Question";

export async function getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    const rows = await db("questions")
        .where({ quiz_id: quizId })
        .orderBy("id", "asc")
        .select("id", "text", "options", "correct_index");

    if (rows.length === 0) throw new Error(`No questions found for quiz ${quizId}`);

    return rows.map((row) => ({
        id: row.id,
        text: row.text,
        options: typeof row.options === "string" ? JSON.parse(row.options) : row.options,
        correctIndex: row.correct_index,
    }));
}
