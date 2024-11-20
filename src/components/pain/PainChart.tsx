import { useMemo, useState } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PainEntry } from '@/lib/types';

interface PainChartProps {
  entries: PainEntry[];
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

type TimeRange = '7d' | '30d' | '90d' | 'custom';

const timeRangeOptions = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 3 months', days: 90 },
  'custom': { label: 'Custom Range', days: 0 },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Date
            </span>
            <span className="font-bold text-foreground">{label}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Pain Level
            </span>
            <span className="font-bold text-foreground">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function PainChart({ entries, dateRange, onDateRangeChange }: PainChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    if (value !== 'custom') {
      const to = new Date();
      const from = value === '90d' 
        ? subMonths(to, 3)
        : subDays(to, timeRangeOptions[value].days);
      onDateRangeChange({ from, to });
    }
  };

  const chartData = useMemo(() => {
    const filteredEntries = entries.filter(
      entry => entry.date >= dateRange.from && entry.date <= dateRange.to
    );

    const dailyData = filteredEntries.reduce((acc, entry) => {
      const dateStr = format(entry.date, 'yyyy-MM-dd');
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: entry.date,
          totalPain: entry.painLevel,
          count: 1,
        };
      } else {
        acc[dateStr].totalPain += entry.painLevel;
        acc[dateStr].count += 1;
      }
      return acc;
    }, {} as Record<string, { date: Date; totalPain: number; count: number }>);

    return Object.values(dailyData)
      .map(({ date, totalPain, count }) => ({
        date: format(date, 'MMM d'),
        painLevel: Number((totalPain / count).toFixed(1)),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries, dateRange]);

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-2">
        <div>
          <CardTitle>Pain Level Trends</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Track your pain levels over time
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeRangeOptions).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timeRange === 'custom' && (
            <DateRangePicker
              value={dateRange}
              onChange={onDateRangeChange}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData} 
                margin={{ 
                  top: 20, 
                  right: 5,
                  left: 0,
                  bottom: 25 
                }}
              >
                <defs>
                  <linearGradient id="fillPain" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="rgb(226, 54, 112)"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor="rgb(226, 54, 112)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-muted"
                />
                <XAxis 
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  className="text-muted-foreground text-xs"
                  tick={{ fontSize: 11 }}
                  width={20}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Area
                  type="natural"
                  dataKey="painLevel"
                  stroke="rgb(226, 54, 112)"
                  strokeWidth={2}
                  fill="url(#fillPain)"
                  fillOpacity={1}
                  dot={{ 
                    r: 3, 
                    fill: "white",
                    strokeWidth: 2,
                    stroke: "rgb(226, 54, 112)"
                  }}
                  activeDot={{ 
                    r: 5, 
                    fill: "rgb(226, 54, 112)",
                    stroke: "white",
                    strokeWidth: 2
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">No data available for the selected date range</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}