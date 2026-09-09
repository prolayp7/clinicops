import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest.config.ts does not enable `test.globals`, so React Testing Library's automatic
// afterEach detection never fires; without this, DOM from one test leaks into the next.
afterEach(cleanup);
