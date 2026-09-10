import { expect, it } from "vitest";
import { publicError } from "@/lib/public-error";
it("hides ORM details while preserving controlled business errors", () => {
  const error = new Error("sensitive query parameters");
  error.name = "PrismaClientKnownRequestError";
  expect(publicError(error, "Retry the operation.")).toBe("Retry the operation.");
  expect(publicError(new Error("Insufficient balance."), "Retry.")).toBe("Insufficient balance.");
});
