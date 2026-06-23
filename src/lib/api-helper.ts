import { NextResponse } from "next/server";
import { AppError } from "../errors/errors";
import { logger } from "./logger";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    logger.warn(`API Error: ${error.message}`, { code: error.code, statusCode: error.statusCode });
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    logger.warn(`Validation Error: ${issues}`);
    return NextResponse.json(
      { error: `Validation failed: ${issues}`, code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  logger.error("Unhandled API Error", {}, error as Error);
  return NextResponse.json(
    { error: "An unexpected error occurred", code: "INTERNAL_SERVER_ERROR" },
    { status: 500 }
  );
}
