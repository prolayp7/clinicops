export function Header({ fullName, role }: { fullName: string; role: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-section-title text-navy-900">Dashboard</div>
      <div className="text-body text-slate-600">
        {fullName} <span className="text-slate-600">· {role.replace("_", " ")}</span>
      </div>
    </header>
  );
}
