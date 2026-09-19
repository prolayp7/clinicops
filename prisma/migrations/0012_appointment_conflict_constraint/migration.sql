-- Reconstructed to match the already-applied state of the live database (this migration was
-- previously applied directly; the file is being restored to keep prisma migrate status clean).

-- Database-level guarantee that a doctor cannot hold two overlapping active appointments, on top
-- of the application-level conflict check in appointments-service.ts. btree_gist is required for
-- an equality exclusion term (doctorId) alongside the range overlap term.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_doctor_overlap"
  EXCLUDE USING gist (
    "doctorId" WITH =,
    tsrange("date" + "startTime", "date" + "endTime", '[)') WITH &&
  )
  WHERE (
    "status" = ANY (ARRAY['REQUESTED', 'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION', 'COMPLETED']::"AppointmentStatus"[])
  );
