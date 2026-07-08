'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DreWaterfallChartProps {
  data: {
    name: string;
    valor: [number, number];
    display: number;
    color: string;
  }[];
}

export default function DreWaterfallChart({ data }: DreWaterfallChartProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: '#0f1422', borderColor: '#1e293b' }}
          itemStyle={{ fontSize: '11px', color: '#fff' }}
          labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
          formatter={(value: any, name: any, props: any) => {
            const displayVal = props.payload.display;
            return [formatCurrency(displayVal), 'Valor Efetivo'];
          }}
        />
        <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
