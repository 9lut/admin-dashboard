"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SystemActivityChartProps {
    data: any[];
}

export const SystemActivityChart = ({ data }: SystemActivityChartProps) => {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                        dataKey="_id"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                        dy={10}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                        }}
                    />
                    <YAxis 
                        hide 
                        axisLine={false} 
                        tickLine={false} 
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--surface-2)' }}
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            backgroundColor: 'var(--surface)',
                            padding: '12px'
                        }}
                        labelStyle={{ color: 'var(--muted)', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}
                        itemStyle={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                        formatter={(value: number | undefined) => [value ?? 0, 'System Events']}
                    />
                    <Bar 
                        dataKey="count" 
                        fill="#1468c2" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
