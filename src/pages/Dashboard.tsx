import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, Clock, Banknote } from 'lucide-react';
import { api } from '@/services/api';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface TaskTypeDist {
  name: string;
  value: number;
}

interface WorkHourTrend {
  date: string;
  hours: number;
}

interface SalaryDist {
  month: string;
  totalSalary: number;
  baseSalary: number;
  pieceRateSalary: number;
  overtimePay: number;
}

export function Dashboard() {
  const [stats, setStats] = useState({
    samplers: 0,
    tasks: 0,
    workHours: 0,
    salaries: 0,
  });
  const [taskTypeDist, setTaskTypeDist] = useState<TaskTypeDist[]>([]);
  const [workHourTrend, setWorkHourTrend] = useState<WorkHourTrend[]>([]);
  const [salaryDist, setSalaryDist] = useState<SalaryDist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.samplers.list(),
      api.tasks.list(),
      api.workHours.list(),
      api.salaries.list(),
    ]).then(([samplers, tasks, workHours, salaries]) => {
      setStats({
        samplers: samplers?.length || 0,
        tasks: tasks?.length || 0,
        workHours: workHours?.length || 0,
        salaries: salaries?.length || 0,
      });

      // 任务类型分布
      const typeCount: Record<string, number> = {};
      tasks?.forEach((task: any) => {
        typeCount[task.task_type || '未知'] = (typeCount[task.task_type || '未知'] || 0) + 1;
      });
      setTaskTypeDist(Object.entries(typeCount).map(([name, value]) => ({ name, value })));

      // 工时趋势（最近 7 天）
      const hourByDate: Record<string, number> = {};
      workHours?.forEach((wh: any) => {
        const date = wh.work_date ? new Date(wh.work_date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) : '未知';
        hourByDate[date] = (hourByDate[date] || 0) + (wh.total_hours || 0);
      });
      const sortedDates = Object.keys(hourByDate).sort().slice(-7);
      setWorkHourTrend(sortedDates.map(date => ({ date, hours: hourByDate[date] })));

      // 薪酬分布（最近 6 个月）
      const salaryByMonth: Record<string, any> = {};
      salaries?.forEach((s: any) => {
        const month = s.year_month || '未知';
        if (!salaryByMonth[month]) {
          salaryByMonth[month] = { month, totalSalary: 0, baseSalary: 0, pieceRateSalary: 0, overtimePay: 0 };
        }
        salaryByMonth[month].totalSalary += s.total_salary || 0;
        salaryByMonth[month].baseSalary += s.base_salary || 0;
        salaryByMonth[month].pieceRateSalary += s.piece_rate_salary || 0;
        salaryByMonth[month].overtimePay += s.overtime_pay || 0;
      });
      const sortedMonths = Object.keys(salaryByMonth).sort().slice(-6);
      setSalaryDist(sortedMonths.map(m => salaryByMonth[m]));

      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  const statCards = [
    { title: '采样员总数', value: stats.samplers, icon: Users, color: 'text-blue-600' },
    { title: '采样任务数', value: stats.tasks, icon: ClipboardList, color: 'text-green-600' },
    { title: '工时记录数', value: stats.workHours, icon: Clock, color: 'text-orange-600' },
    { title: '薪酬记录数', value: stats.salaries, icon: Banknote, color: 'text-purple-600' },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">仪表盘</h1>
      
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>任务类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            {taskTypeDist.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={taskTypeDist}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskTypeDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>工时趋势（最近 7 天）</CardTitle>
          </CardHeader>
          <CardContent>
            {workHourTrend.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px]">
                <BarChart data={workHourTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="hours" fill="#3b82f6" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>薪酬构成趋势（最近 6 个月）</CardTitle>
        </CardHeader>
        <CardContent>
          {salaryDist.length > 0 ? (
            <ChartContainer config={{}} className="h-[300px]">
              <LineChart data={salaryDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="totalSalary" stroke="#8884d8" name="总薪酬" />
                <Line type="monotone" dataKey="baseSalary" stroke="#82ca9d" name="基础工资" />
                <Line type="monotone" dataKey="pieceRateSalary" stroke="#ffc658" name="计件工资" />
                <Line type="monotone" dataKey="overtimePay" stroke="#ff8042" name="加班工资" />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>欢迎使用采样员薪酬管理系统</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            本系统提供采样员信息管理、采样任务分配、工时记录和薪酬核算等功能。
            请使用左侧导航栏访问各个功能模块。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
