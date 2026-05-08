import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Banknote, TrendingUp, ShieldCheck } from 'lucide-react';
import { api } from '@/services/api';
import { ChartContainer } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

interface SalaryRecord {
  year_month: string;
  total_salary: number;
  performance_salary: number;
  comprehensive_score: number;
  veto: number;
}

interface SalaryTrend {
  month: string;
  totalSalary: number;
  performanceSalary: number;
}

interface ScoreTrend {
  month: string;
  comprehensiveScore: number;
}

export function Dashboard() {
  const [stats, setStats] = useState({
    samplers: 0,
    salaries: 0,
    totalSalary: 0,
    vetoCount: 0,
  });
  const [salaryTrend, setSalaryTrend] = useState<SalaryTrend[]>([]);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.samplers.list(),
      api.salaries.list(),
    ]).then(([samplers, salaries]) => {
      const salaryRows = (salaries || []) as SalaryRecord[];

      setStats({
        samplers: samplers?.length || 0,
        salaries: salaryRows.length,
        totalSalary: salaryRows.reduce((sum, row) => sum + (row.total_salary || 0), 0),
        vetoCount: salaryRows.filter((row) => row.veto).length,
      });

      const byMonth: Record<string, { month: string; totalSalary: number; performanceSalary: number; scoreSum: number; count: number }> = {};
      salaryRows.forEach((row) => {
        const month = row.year_month || '未填月份';
        if (!byMonth[month]) {
          byMonth[month] = { month, totalSalary: 0, performanceSalary: 0, scoreSum: 0, count: 0 };
        }
        byMonth[month].totalSalary += row.total_salary || 0;
        byMonth[month].performanceSalary += row.performance_salary || 0;
        byMonth[month].scoreSum += row.comprehensive_score || 0;
        byMonth[month].count += 1;
      });

      const months = Object.keys(byMonth).sort().slice(-6);
      setSalaryTrend(months.map((month) => ({
        month,
        totalSalary: Number(byMonth[month].totalSalary.toFixed(2)),
        performanceSalary: Number(byMonth[month].performanceSalary.toFixed(2)),
      })));
      setScoreTrend(months.map((month) => ({
        month,
        comprehensiveScore: Number((byMonth[month].scoreSum / Math.max(byMonth[month].count, 1)).toFixed(2)),
      })));
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  const statCards = [
    { title: '采样岗位人数', value: stats.samplers, icon: Users, color: 'text-blue-600' },
    { title: '月度薪酬记录', value: stats.salaries, icon: Banknote, color: 'text-green-600' },
    { title: '应发工资合计', value: `¥${stats.totalSalary.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600' },
    { title: '一票否决记录', value: stats.vetoCount, icon: ShieldCheck, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground mt-1">按 V3 制度统计采样岗位、月度工资和综合考评结果。</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>薪酬趋势（最近 6 个月）</CardTitle>
          </CardHeader>
          <CardContent>
            {salaryTrend.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px]">
                <LineChart data={salaryTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Line type="monotone" dataKey="totalSalary" stroke="#2563eb" name="应发工资" />
                  <Line type="monotone" dataKey="performanceSalary" stroke="#16a34a" name="绩效工资" />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">暂无薪酬记录</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>综合得分均值（最近 6 个月）</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreTrend.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px]">
                <BarChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Bar dataKey="comprehensiveScore" fill="#0f766e" name="综合得分" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">暂无考评记录</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
