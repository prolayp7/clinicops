import { Badge } from "@/components/ui/badge";
import type { ClinicalStatus } from "@/lib/doctor-directory";

const LABEL: Record<ClinicalStatus, string> = {
  AVAILABLE: "Available",
  IN_CONSULTATION: "In Consultation",
  ON_LEAVE: "On Leave",
  OFF_DUTY: "Off Duty",
};

const VARIANT: Record<ClinicalStatus, "success" | "info" | "warning" | "secondary"> = {
  AVAILABLE: "success",
  IN_CONSULTATION: "info",
  ON_LEAVE: "warning",
  OFF_DUTY: "secondary",
};

export function DoctorClinicalStatusBadge({ status }: { status: ClinicalStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
