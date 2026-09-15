import { useState } from "react";
import type { NecessaryDecision, QuestionAnswer } from "../types";

interface OpenQuestionsFormProps {
  questions: NecessaryDecision[];
  loading: boolean;
  onRegenerate: (answers: QuestionAnswer[]) => void;
}

export function OpenQuestionsForm({ questions, loading, onRegenerate }: OpenQuestionsFormProps) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));

  const answeredCount = answers.filter((a) => a.trim().length > 0).length;

  function handleChange(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit() {
    const payload: QuestionAnswer[] = questions
      .map((q, i) => ({ question: q.question, answer: answers[i].trim() }))
      .filter((a) => a.answer.length > 0);
    if (payload.length === 0) return;
    onRegenerate(payload);
  }

  return (
    <section className="section open-questions-form">
      <h3>Decisiones necesarias para continuar</h3>
      <p className="open-questions-form__hint">
        Son preguntas imprescindibles: sin responderlas no se puede avanzar bien. Respóndelas y vuelve a generar el
        prompt con tus respuestas ya incorporadas.
      </p>
      <div className="open-questions-form__list">
        {questions.map((q, i) => (
          <div className="open-questions-form__item" key={i}>
            <label htmlFor={`oq-${i}`}>{q.question}</label>
            <div className="reason">{q.why_necessary}</div>
            <textarea
              id={`oq-${i}`}
              value={answers[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              rows={2}
              disabled={loading}
              placeholder="Tu respuesta (opcional)"
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={handleSubmit} disabled={loading || answeredCount === 0}>
        {loading ? "Generando…" : "Volver a generar con estas respuestas"}
      </button>
    </section>
  );
}
