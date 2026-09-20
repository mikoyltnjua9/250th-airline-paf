"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { saveAnswer, submitExam } from "@/app/exams/actions";
import type { RunnerData } from "@/lib/exams/queries";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * The exam screen. Every answer is saved to the server the moment it's
 * chosen, so closing the tab, losing connection or hitting the inactivity
 * timeout never loses progress -- they resume the same attempt, in the same
 * order. Grading happens on the server from what was saved; nothing on this
 * screen (or in the data sent to it) says which option is correct.
 */
export function ExamRunner({ attemptId, title, category, skillLevel, questions, answers: initial }: RunnerData) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [unsaved, setUnsaved] = useState<Set<string>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  // Saves run one at a time, in order, so a fast clicker can't have a later
  // answer overwritten by an earlier, slower request.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const question = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unanswered = questions.length - answeredCount;

  function persist(questionId: string, optionId: string) {
    const run = async () => {
      let ok = false;
      try {
        ok = (await saveAnswer(attemptId, questionId, optionId)).ok;
      } catch {
        ok = false;
      }
      setUnsaved((prev) => {
        const next = new Set(prev);
        if (ok) next.delete(questionId);
        else next.add(questionId);
        return next;
      });
      return ok;
    };
    queue.current = queue.current.then(run);
    return queue.current as Promise<boolean>;
  }

  function choose(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
    void persist(question.id, optionId);
  }

  async function handleSubmit() {
    setSubmitError(null);
    // Make sure everything on screen has actually reached the server before
    // grading: retry anything that failed to save.
    await queue.current;
    let failed = false;
    for (const [qid, oid] of Object.entries(answers)) {
      if (unsaved.has(qid)) {
        const ok = await persist(qid, oid);
        if (!ok) failed = true;
      }
    }
    if (failed) {
      setSubmitError("Some answers couldn't be saved. Check your connection and try again.");
      return;
    }
    startSubmit(async () => {
      try {
        await submitExam(attemptId);
      } catch (e) {
        // A redirect after a successful submit is thrown by Next and handled
        // by it; anything else is a real failure.
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
        setSubmitError("Couldn't submit your exam. Your answers are saved -- try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {category}
            {skillLevel ? ` · ${skillLevel} Skill` : ""}
          </p>
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {answeredCount} of {questions.length} answered
        </p>
      </div>

      {unsaved.size > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Connection problem</AlertTitle>
          <AlertDescription>
            {unsaved.size} answer{unsaved.size === 1 ? "" : "s"} couldn&apos;t be saved yet. They&apos;ll
            be retried when you submit; keep this page open.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Question {index + 1} of {questions.length}
              </p>
              <p className="mt-1 text-base leading-relaxed font-medium">{question.body}</p>
            </div>

            <div className="space-y-2" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, i) => {
                const selected = answers[question.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => choose(option.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                        selected ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="leading-relaxed">{option.body}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                Previous
              </Button>
              {index < questions.length - 1 ? (
                <Button type="button" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={() => setReviewOpen(true)}>
                  Review &amp; submit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Questions</p>
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 lg:grid-cols-5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Question ${i + 1}${answers[q.id] ? ", answered" : ", not answered"}`}
                  className={cn(
                    "h-8 rounded text-[11px] font-medium tabular-nums transition-colors",
                    i === index
                      ? "bg-primary text-primary-foreground"
                      : answers[q.id]
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => setReviewOpen(true)}>
              Review &amp; submit
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Unanswered questions count as wrong.`
                : "You've answered every question."}{" "}
              Once submitted, you can&apos;t change your answers.
            </DialogDescription>
          </DialogHeader>
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={submitting}>
              Keep working
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
