import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

const columns = [
  { key: "name", label: "Name" },
  { key: "count", label: "Count" },
];

describe("toCsv", () => {
  it("writes a header row followed by one row per record", () => {
    const csv = toCsv(columns, [{ name: "Alice", count: 3 }, { name: "Bob", count: 5 }]);
    expect(csv).toBe("Name,Count\r\nAlice,3\r\nBob,5");
  });

  it("returns just the header for an empty row set", () => {
    expect(toCsv(columns, [])).toBe("Name,Count");
  });

  it("fills a missing field with an empty string", () => {
    const csv = toCsv(columns, [{ name: "Alice" }]);
    expect(csv).toBe("Name,Count\r\nAlice,");
  });

  it("quotes a field containing a comma", () => {
    const csv = toCsv(columns, [{ name: "Smith, John", count: 1 }]);
    expect(csv).toBe('Name,Count\r\n"Smith, John",1');
  });

  it("quotes a field containing a newline", () => {
    const csv = toCsv(columns, [{ name: "Line1\nLine2", count: 1 }]);
    expect(csv).toBe('Name,Count\r\n"Line1\nLine2",1');
  });

  it("doubles embedded quotes and wraps the field in quotes", () => {
    const csv = toCsv(columns, [{ name: 'Say "hi"', count: 1 }]);
    expect(csv).toBe('Name,Count\r\n"Say ""hi""",1');
  });

  it("leaves a plain field unquoted", () => {
    const csv = toCsv(columns, [{ name: "Alice", count: 3 }]);
    expect(csv.split("\r\n")[1]).toBe("Alice,3");
  });
});
