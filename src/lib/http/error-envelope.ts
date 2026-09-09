import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

export function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): NextResponse<ErrorEnvelope> {
  return NextResponse.json({ error: { code, message, fieldErrors } }, { status });
}

/** Converts a Zod validation failure into the standard field-error envelope (400). */
export function validationErrorResponse(error: ZodError): NextResponse<ErrorEnvelope> {
  return errorResponse(400, "VALIDATION_ERROR", "One or more fields are invalid.", error.flatten().fieldErrors as Record<string, string[]>);
}

export function forbiddenResponse(message = "You do not have permission to perform this action."): NextResponse<ErrorEnvelope> {
  return errorResponse(403, "FORBIDDEN", message);
}

export function unauthorizedResponse(message = "Sign-in is required."): NextResponse<ErrorEnvelope> {
  return errorResponse(401, "UNAUTHORIZED", message);
}
