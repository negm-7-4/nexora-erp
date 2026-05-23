/* Recharts wrappers themed for the app — used across every feature. */
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart as RPieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

export const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#7c3aed", "#06b6d4", "#fb7185", "#34d399", "#a78bfa", "#fbbf24"];

const tooltipStyle = {
  background: "rgba(13,27,52,.97)", border: "1px solid rgba(59,130,246,.35)",
  borderRadius: 10, color: "#f0f6ff", fontSize: 12, boxShadow: "0 8px 30px rgba(0,0,0,.5)",
};
const axisStyle = { fontSize: 11, fill: "#5b7ca6" };

function NoData({ icon = "📊", text = "No data" }) {
  return <div className="empty" style={{ padding: 30 }}><div className="empty-icon">{icon}</div><div className="empty-txt">{text}</div></div>;
}

export function AreaTrend({ data, keys = [{ key: "value", color: "#3b82f6", name: "Value" }], height = 240, xKey = "label" }) {
  if (!data?.length) return <NoData icon="📈" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <defs>
          {keys.map((k) => (
            <linearGradient id={`grad-${k.key}`} key={k.key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={k.color} stopOpacity={0.5} />
              <stop offset="95%" stopColor={k.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,.08)" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip contentStyle={tooltipStyle} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {keys.map((k) => (
          <Area key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2.5} fill={`url(#grad-${k.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, keys = [{ key: "value", color: "#3b82f6", name: "Value" }], height = 240, xKey = "label" }) {
  if (!data?.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,.08)" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(59,130,246,.06)" }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {keys.map((k) => (
          <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Lines({ data, keys, height = 240, xKey = "label" }) {
  if (!data?.length) return <NoData icon="📉" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,.08)" />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 240, nameKey = "label", dataKey = "value" }) {
  if (!data?.length || data.every((d) => !d[dataKey])) return <NoData icon="🍩" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RPieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="var(--deep)" strokeWidth={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RPieChart>
    </ResponsiveContainer>
  );
}

export function PieChart({ data, height = 240, nameKey = "label", dataKey = "value" }) {
  if (!data?.length || data.every((d) => !d[dataKey])) return <NoData icon="🥧" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RPieChart>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey} outerRadius="80%" stroke="var(--deep)" strokeWidth={2} label={(e) => `${Math.round((e.percent || 0) * 100)}%`} labelLine={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RPieChart>
    </ResponsiveContainer>
  );
}
