import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

type StatusError = Error & { statusCode?: number };

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      issues: error.flatten()
    });
    return;
  }

  const statusCode: number =
    typeof (error as StatusError)?.statusCode === "number" ? (error as StatusError).statusCode ?? 500 : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";

  res.status(statusCode).json({ message });
};
