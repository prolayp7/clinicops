export function TemporaryPasswordNotice({ password }: { password: string }) {
  return (
    <div className="border-warning bg-warning/5 rounded-lg border p-3">
      <p className="text-body text-foreground font-semibold">
        Temporary password: <span className="font-mono">{password}</span>
      </p>
      <p className="text-caption text-muted-foreground mt-1">
        Share this with them now through a secure channel — it will not be shown again.
      </p>
    </div>
  );
}
