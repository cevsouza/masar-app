'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ChartData {
  mes: string;
  previsto: number;
  realizado: number;
}

export default function CashFlowChart({ data }: { data: ChartData[] }) {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="mes" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            tickFormatter={(v) => `R$ ${v / 1000}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#151b2c', borderColor: '#1e293b', borderRadius: '8px' }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
            formatter={(value: any) => [formatCurrency(Number(value || 0)), '']}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Area 
            name="Entradas Totais (Receitas)" 
            type="monotone" 
            dataKey="previsto" 
            stroke="#3b82f6" 
            fillOpacity={1} 
            fill="url(#colorPrevisto)" 
            strokeWidth={2}
          />
          <Area 
            name="Saídas Totais (Despesas)" 
            type="monotone" 
            dataKey="realizado" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorRealizado)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
