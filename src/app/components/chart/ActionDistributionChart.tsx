"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ActionDistributionChartProps {
    data: any[];
}

export const ActionDistributionChart = ({ data }: ActionDistributionChartProps) => {
    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="58%" data={data}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis 
                        dataKey="action" 
                        tick={{ fill: 'var(--muted)', fontSize: 11, fontWeight: 600 }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar
                        name="System Actions"
                        dataKey="count"
                        stroke="#1468c2"
                        fill="#1468c2"
                        fillOpacity={0.4}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            backgroundColor: 'var(--surface)',
                            padding: '8px 12px'
                        }}
                        itemStyle={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px' }}
                        labelStyle={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '4px' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
