"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBreakdown } from "../_data";

const totalIntake = statusBreakdown.reduce((sum, s) => sum + s.value, 0);

export function AppointmentStatusDonut() {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-section-title text-foreground font-semibold">
          Appointment Status
        </CardTitle>
        <p className="text-caption text-muted-foreground mt-0.5">
          Real-time status breakdown for today
        </p>
      </CardHeader>
      <CardContent>
        <table className="sr-only">
          <caption>Appointment status breakdown</caption>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percent</th>
            </tr>
          </thead>
          <tbody>
            {statusBreakdown.map((s) => (
              <tr key={s.key}>
                <td>{s.label}</td>
                <td>{s.value}</td>
                <td>{s.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div aria-hidden="true" className="relative flex items-center justify-center py-2">
          <div className="h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusBreakdown.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-card-metric text-foreground font-bold leading-none">
              {totalIntake}
            </span>
            <span className="text-caption text-muted-foreground mt-0.5 uppercase tracking-wider">
              Total Intake
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="space-y-1.5 pt-1">
          {statusBreakdown.map((s) => (
            <div key={s.key} className="flex items-center justify-between text-caption">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-foreground font-medium">{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-semibold">{s.value}</span>
                <span className="text-muted-foreground w-8 text-right">{s.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
