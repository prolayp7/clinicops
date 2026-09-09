import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Role } from "@prisma/client";
import { Sidebar } from "@/components/shared/sidebar";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Sidebar", () => {
  it("renders the Dashboard link for a staff role", () => {
    render(<Sidebar role={Role.DOCTOR} />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders no nav items for the patient role", () => {
    render(<Sidebar role={Role.PATIENT} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
