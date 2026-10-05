"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/shared/date-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  "REQUESTED",
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

type DoctorOption = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  department: { name: string };
};

type DoctorSearchResponse = { items: DoctorOption[]; hasMore: boolean };

export function AppointmentFilters({
  date,
  doctorId,
  status,
  view,
  selectedDoctor,
}: {
  date: string;
  doctorId: string;
  status: string;
  view: "list" | "calendar";
  selectedDoctor: DoctorOption | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [doctorPickerOpen, setDoctorPickerOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [hasMoreDoctors, setHasMoreDoctors] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [doctorSearchError, setDoctorSearchError] = useState<string | null>(null);
  const [doctorRequestVersion, setDoctorRequestVersion] = useState(0);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/appointments?${next.toString()}`);
  }

  useEffect(() => {
    if (!doctorPickerOpen) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void (async () => {
        setDoctorSearchError(null);
        try {
          const params = new URLSearchParams({ q: doctorSearch, page: String(doctorPage) });
          const response = await fetch(`/api/appointment-doctors?${params}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Could not load doctors.");

          const result = (await response.json()) as DoctorSearchResponse;
          setDoctorOptions((current) =>
            doctorPage === 1 ? result.items : [...current, ...result.items],
          );
          setHasMoreDoctors(result.hasMore);
        } catch {
          if (!controller.signal.aborted) setDoctorSearchError("Could not load doctors. Try again.");
        } finally {
          if (!controller.signal.aborted) setIsLoadingDoctors(false);
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [doctorPickerOpen, doctorPage, doctorRequestVersion, doctorSearch]);

  function changeDoctorSearch(value: string) {
    setDoctorSearch(value);
    setDoctorPage(1);
    setDoctorOptions([]);
    setHasMoreDoctors(false);
    setDoctorSearchError(null);
    setIsLoadingDoctors(true);
  }

  function chooseDoctor(id: string) {
    updateParam("doctorId", id);
    setDoctorPickerOpen(false);
    changeDoctorSearch("");
  }

  const visibleDoctorOptions =
    selectedDoctor && !doctorOptions.some((doctor) => doctor.id === selectedDoctor.id)
      ? [selectedDoctor, ...doctorOptions]
      : doctorOptions;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
        <Button
          type="button"
          size="sm"
          variant={view === "calendar" ? "default" : "ghost"}
          onClick={() => updateParam("view", "calendar")}
        >
          Calendar
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "ghost"}
          onClick={() => updateParam("view", "list")}
        >
          List
        </Button>
      </div>
      <DatePicker
        ariaLabel="Appointment date"
        value={date}
        onValueChange={(value) => updateParam("date", value)}
        className="w-40"
      />
      <Popover
        open={doctorPickerOpen}
        onOpenChange={(open) => {
          setDoctorPickerOpen(open);
          setIsLoadingDoctors(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-haspopup="listbox"
            aria-expanded={doctorPickerOpen}
            className="w-52 justify-between font-normal"
          >
            <span className="truncate">{selectedDoctor?.fullName ?? "All doctors"}</span>
            <ChevronDown className="size-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="relative border-b p-2">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2" />
            <Input
              type="search"
              role="combobox"
              aria-label="Search doctors by name or department"
              aria-expanded={doctorPickerOpen}
              aria-controls="appointment-doctor-options"
              placeholder="Search doctors or departments"
              value={doctorSearch}
              onChange={(event) => changeDoctorSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div
            id="appointment-doctor-options"
            role="listbox"
            aria-label="Doctors"
            className="max-h-72 overflow-y-auto p-1"
          >
            <button
              type="button"
              role="option"
              aria-selected={!doctorId}
              onClick={() => chooseDoctor("")}
              className="hover:bg-accent flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body"
            >
              All doctors
              {!doctorId && <Check className="text-primary size-4" />}
            </button>
            {visibleDoctorOptions.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                role="option"
                aria-selected={doctorId === doctor.id}
                onClick={() => chooseDoctor(doctor.id)}
                className="hover:bg-accent flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="bg-accent text-primary relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-caption font-semibold">
                    {doctor.photoUrl ? (
                      <Image
                        src={doctor.photoUrl}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="size-9 object-cover"
                      />
                    ) : (
                      doctor.fullName
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block truncate text-body font-medium">
                      {doctor.fullName}
                    </span>
                    <span className="text-muted-foreground block truncate text-caption">
                      {doctor.department.name}
                    </span>
                  </span>
                </span>
                {doctorId === doctor.id && <Check className="text-primary size-4 shrink-0" />}
              </button>
            ))}
            {isLoadingDoctors && (
              <p className="text-muted-foreground px-3 py-2 text-caption" role="status">
                Loading doctors…
              </p>
            )}
            {!isLoadingDoctors && !doctorSearchError && doctorOptions.length === 0 && (
              <p className="text-muted-foreground px-3 py-2 text-caption" role="status">
                No doctors found.
              </p>
            )}
            {doctorSearchError && (
              <div className="flex items-center justify-between gap-2 px-3 py-2" role="alert">
                <p className="text-destructive text-caption">{doctorSearchError}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsLoadingDoctors(true);
                    setDoctorRequestVersion((current) => current + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>
          {hasMoreDoctors && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={isLoadingDoctors}
                onClick={() => {
                  setIsLoadingDoctors(true);
                  setDoctorPage((current) => current + 1);
                }}
              >
                Load more doctors
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {view === "list" && (
        <Select value={status || "all"} onValueChange={(v) => updateParam("status", v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
