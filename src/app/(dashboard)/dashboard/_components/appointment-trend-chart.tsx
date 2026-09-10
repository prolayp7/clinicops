"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MAX_CAPACITY, weeklyTrend } from "../_data";

const chartData = weeklyTrend.map((d) => ({
  ...d,
  total: d.inPerson + d.telehealth + d.walkIn,
}));

export function AppointmentTrendChart() {
  return (
    <Card className="gap-4 lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-section-title text-foreground font-semibold">
              7-Day Appointment Trend &amp; Capacity
            </CardTitle>
            <Badge variant="outline" className="text-primary border-transparent bg-accent">
              Live Trend
            </Badge>
          </div>
          <p className="text-caption text-muted-foreground mt-0.5">
            Tracking daily outpatient volumes against a clinic maximum of {MAX_CAPACITY} patients
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <table className="sr-only">
          <caption>7-day appointment volume by day, in-person vs. telehealth vs. walk-in</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>In-person</th>
              <th>Telehealth</th>
              <th>Walk-in</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.day}>
                <td>{row.day}</td>
                <td>{row.inPerson}</td>
                <td>{row.telehealth}</td>
                <td>{row.walkIn}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div aria-hidden="true" className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                domain={[0, MAX_CAPACITY + 5]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <ReferenceLine
                y={MAX_CAPACITY}
                stroke="var(--destructive)"
                strokeDasharray="4 4"
                label={{
                  value: `Max Capacity (${MAX_CAPACITY})`,
                  position: "insideTopRight",
                  fill: "var(--destructive)",
                  fontSize: 11,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="inPerson" stackId="visits" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="telehealth" stackId="visits" fill="var(--info)" />
              <Bar dataKey="walkIn" stackId="visits" fill="var(--muted-foreground)" radius={[0, 0, 0, 0]} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="border-border mt-2 flex items-center justify-between border-t pt-2">
          <div className="flex flex-wrap items-center gap-4 text-caption">
            <LegendDot color="bg-primary" label="In-Person (62%)" />
            <LegendDot color="bg-info" label="Telehealth (26%)" />
            <LegendDot color="bg-muted-foreground" label="Walk-In Triage (12%)" />
          </div>
          <span className="text-muted-foreground text-caption hidden sm:inline">
            Updated 2m ago
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${color}`} />
      <span className="text-foreground font-medium">{label}</span>
    </div>
  );
}
