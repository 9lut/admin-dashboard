"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ContentDistributionChartProps {
    data: any[];
}

const COLORS = ['#0f4a96', '#1468c2', '#0299d1', '#5cc0f2', '#e3a52f'];

export const ContentDistributionChart = ({ data }: ContentDistributionChartProps) => {
    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            backgroundColor: 'var(--surface)',
                            padding: '8px 12px'
                        }}
                        itemStyle={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px' }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="left"
                        iconType="circle"
                        formatter={(value, entry: any) => (
                            <span style={{ color: 'var(--text-2)', fontSize: '13px', fontWeight: 600, marginLeft: '4px' }}>
                                {value} <span style={{ color: 'var(--muted)', marginLeft: '4px' }}>{entry.payload?.value}</span>
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
