import { describe, expect, it } from "vitest";
import { deriveAssignedPatients, type AppointmentForAssignment } from "@/lib/doctors";

const patient = (id: string) => ({ id, patientId: `PT-${id}`, firstName: "A", lastName: "B", phone: "555" });

const appt = (over: Partial<AppointmentForAssignment>): AppointmentForAssignment => ({
  status: "COMPLETED",
  date: new Date("2026-01-01"),
  patient: patient("p1"),
  ...over,
});

describe("deriveAssignedPatients", () => {
  it("excludes cancelled, no-show and requested appointments", () => {
    for (const status of ["CANCELLED", "NO_SHOW", "REQUESTED"]) {
      expect(deriveAssignedPatients([appt({ status })])).toEqual([]);
    }
  });

  it("includes an active appointment's patient once, keyed by patient id", () => {
    const result = deriveAssignedPatients([
      appt({ status: "SCHEDULED", patient: patient("p1") }),
      appt({ status: "COMPLETED", patient: patient("p1") }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("p1");
  });

  it("keeps the most recent visit date across multiple appointments for the same patient", () => {
    const result = deriveAssignedPatients([
      appt({ patient: patient("p1"), date: new Date("2026-01-01") }),
      appt({ patient: patient("p1"), date: new Date("2026-03-15") }),
      appt({ patient: patient("p1"), date: new Date("2026-02-01") }),
    ]);
    expect(result[0]?.lastVisit).toBe("2026-03-15");
  });

  it("returns one entry per distinct patient", () => {
    const result = deriveAssignedPatients([
      appt({ patient: patient("p1") }),
      appt({ patient: patient("p2") }),
    ]);
    expect(result.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  });
});
