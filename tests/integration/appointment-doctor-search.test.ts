// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  can: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/permissions/policies", () => ({ can: mocks.can }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { doctor: { findMany: mocks.findMany } } }));

import { GET } from "@/app/api/appointment-doctors/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ profile: { role: "ADMIN" } });
  mocks.can.mockReturnValue(true);
  mocks.findMany.mockResolvedValue([]);
});

describe("GET /api/appointment-doctors", () => {
  it("rejects anonymous and unauthorized requests", async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const anonymous = await GET(new Request("http://localhost/api/appointment-doctors"));
    expect(anonymous.status).toBe(401);

    mocks.can.mockReturnValueOnce(false);
    const forbidden = await GET(new Request("http://localhost/api/appointment-doctors"));
    expect(forbidden.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns a bounded page of active doctors with only dropdown fields", async () => {
    mocks.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        id: `doctor-${index}`,
        fullName: `Doctor ${index}`,
        photoUrl: null,
        department: { name: "Cardiology" },
      })),
    );

    const response = await GET(
      new Request("http://localhost/api/appointment-doctors?q=cardio&page=2"),
    );
    const result = await response.json();
    const query = mocks.findMany.mock.calls[0]![0];

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(query.skip).toBe(20);
    expect(query.take).toBe(21);
    expect(query.where.status).toBe("ACTIVE");
    expect(query.where.OR).toHaveLength(2);
    expect(query.select).toEqual({
      id: true,
      fullName: true,
      photoUrl: true,
      department: { select: { name: true } },
    });
  });

  it("rejects invalid page values", async () => {
    const response = await GET(
      new Request("http://localhost/api/appointment-doctors?page=0"),
    );

    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});