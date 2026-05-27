import { ConvexError } from "convex/values";

type ConvexErrorData = {
  message?: unknown;
};

export const getConvexErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!(error instanceof ConvexError)) return fallback;
  if (typeof error.data === "string") return error.data;
  if (error.data && typeof error.data === "object" && "message" in error.data) {
    const message = (error.data as ConvexErrorData).message;
    if (typeof message === "string") return message;
  }
  return fallback;
};
