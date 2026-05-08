import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, DollarSign, FileCheck, Download, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { exportToCSV } from '@/utils/export';

interface SalaryRecord {
  id: number;
  sampler_id: number;
  sampler_name?: string;
  year_month: string;
  basic_salary: number;
  position_salary: number;
  group_revenue: number;
  performance_pool: number;
  equal_performance: number;
  differential_performance: number;
  workload_points: number;
  group_workload_points: number;
  workload_share: number;
  attendance_rate: number;
  quality_score: number;
  timeliness_score: number;
  equipment_score: number;
  comprehensive_score: number;
  comprehensive_coefficient: number;
  performance_salary: number;
  other_pay: number;
  veto: number;
  total_salary: number;
  actual_salary: number;
  payment_status: string;
  payment_date?: string;
}

interface Sampler {
  id: number;
  name: string;
}

const defaultFormData = {
  sampler_id: 0,
  year_month: new Date().toISOString().slice(0, 7),
  group_revenue: 100000,
  distribution_count: 4,
  workload_points: 25,
  group_workload_points: 100,
  attendance_days: 22,
  required_attendance_days: 22,
  quality_score: 100,
  timeliness_score: 100,
  equipment_score: 100,
  other_pay: 0,
  veto: false,
  veto_reason: '',
};

export function SalaryList() {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [samplers, setSamplers] = useState<Sampler[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salaryData, samplersData] = await Promise.all([
        api.salaries.list(),
        api.samplers.list(),
      ]);
      setSalaryRecords(salaryData || []);
      setSamplers(samplersData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.salaries.calculate(formData);
      setCalculateDialogOpen(false);
      loadData();
      alert('薪酬计算成功');
    } catch (error) {
      alert('计算失败');
    }
  };

  const handlePay = async (id: number) => {
    try {
      await api.salaries.pay(id);
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const openCalculateDialog = () => {
    setFormData({
      ...defaultFormData,
      year_month: new Date().toISOString().slice(0, 7),
    });
    setCalculateDialogOpen(true);
  };

  const handleExport = () => {
    exportToCSV(
      salaryRecords,
      '薪酬记录列表',
      [
        { key: 'sampler_name', label: '采样员' },
        { key: 'year_month', label: '年月' },
        { key: 'basic_salary', label: '基本工资' },
        { key: 'position_salary', label: '岗位工资' },
        { key: 'performance_pool', label: '小组绩效池' },
        { key: 'equal_performance', label: '均分绩效' },
        { key: 'differential_performance', label: '差异绩效' },
        { key: 'performance_salary', label: '个人绩效工资' },
        { key: 'comprehensive_score', label: '综合得分' },
        { key: 'comprehensive_coefficient', label: '综合系数' },
        { key: 'total_salary', label: '应发工资' },
        { key: 'payment_status', label: '发放状态' },
      ]
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'paid' ? 'default' : 'secondary'}>
        {status === 'paid' ? '已发放' : '未发放'}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  const totalSalary = salaryRecords.reduce((sum, record) => sum + (record.total_salary || 0), 0);
  const paidSalary = salaryRecords
    .filter((record) => record.payment_status === 'paid')
    .reduce((sum, record) => sum + (record.actual_salary || 0), 0);
  const unpaidSalary = salaryRecords
    .filter((record) => record.payment_status === 'unpaid')
    .reduce((sum, record) => sum + (record.actual_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">薪酬管理</h1>
          <p className="text-muted-foreground mt-1">按 V3 制度：基本工资、岗位工资、绩效池 70/30 分配、综合系数和出勤折算。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
          <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCalculateDialog}>
                <Calculator className="mr-2 h-4 w-4" />
                计算薪酬
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>计算月度薪酬</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCalculate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="sampler_id">采样员</Label>
                    <select
                      id="sampler_id"
                      value={formData.sampler_id}
                      onChange={(e) => setFormData({ ...formData, sampler_id: parseInt(e.target.value, 10) })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      required
                    >
                      <option value={0}>请选择采样员</option>
                      {samplers.map((sampler) => (
                        <option key={sampler.id} value={sampler.id}>
                          {sampler.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="year_month">年月</Label>
                    <Input
                      id="year_month"
                      type="month"
                      value={formData.year_month}
                      onChange={(e) => setFormData({ ...formData, year_month: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="group_revenue">小组当月有效业绩</Label>
                    <Input id="group_revenue" type="number" value={formData.group_revenue} onChange={(e) => setFormData({ ...formData, group_revenue: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="distribution_count">绩效分配人数</Label>
                    <Input id="distribution_count" type="number" value={formData.distribution_count} onChange={(e) => setFormData({ ...formData, distribution_count: parseInt(e.target.value, 10) || 1 })} required />
                  </div>
                  <div>
                    <Label htmlFor="workload_points">个人有效作业点数</Label>
                    <Input id="workload_points" type="number" value={formData.workload_points} onChange={(e) => setFormData({ ...formData, workload_points: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="group_workload_points">小组有效作业点数</Label>
                    <Input id="group_workload_points" type="number" value={formData.group_workload_points} onChange={(e) => setFormData({ ...formData, group_workload_points: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="attendance_days">实际计薪在岗天数</Label>
                    <Input id="attendance_days" type="number" step="0.5" value={formData.attendance_days} onChange={(e) => setFormData({ ...formData, attendance_days: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="required_attendance_days">应出勤天数</Label>
                    <Input id="required_attendance_days" type="number" step="0.5" value={formData.required_attendance_days} onChange={(e) => setFormData({ ...formData, required_attendance_days: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="quality_score">质量得分</Label>
                    <Input id="quality_score" type="number" min="0" max="100" value={formData.quality_score} onChange={(e) => setFormData({ ...formData, quality_score: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="timeliness_score">时效得分</Label>
                    <Input id="timeliness_score" type="number" min="0" max="100" value={formData.timeliness_score} onChange={(e) => setFormData({ ...formData, timeliness_score: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="equipment_score">设备得分</Label>
                    <Input id="equipment_score" type="number" min="0" max="100" value={formData.equipment_score} onChange={(e) => setFormData({ ...formData, equipment_score: parseFloat(e.target.value) || 0 })} required />
                  </div>
                  <div>
                    <Label htmlFor="other_pay">其他应发项目</Label>
                    <Input id="other_pay" type="number" value={formData.other_pay} onChange={(e) => setFormData({ ...formData, other_pay: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="veto"
                    type="checkbox"
                    checked={formData.veto}
                    onChange={(e) => setFormData({ ...formData, veto: e.target.checked })}
                  />
                  <Label htmlFor="veto">触发一票否决，当月个人绩效工资为 0</Label>
                </div>
                {formData.veto && (
                  <div>
                    <Label htmlFor="veto_reason">一票否决说明</Label>
                    <Input id="veto_reason" value={formData.veto_reason} onChange={(e) => setFormData({ ...formData, veto_reason: e.target.value })} />
                  </div>
                )}
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm text-muted-foreground">
                  <p>个人绩效工资 = （均分绩效 + 差异绩效）× 综合系数 × 出勤折算率。</p>
                  <p>均分绩效 = 小组绩效池 × 70% ÷ 分配人数；差异绩效 = 小组绩效池 × 30% × 个人工作量占比。</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCalculateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">开始计算</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">应发工资合计</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{totalSalary.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">按制度口径统计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已发放</CardTitle>
            <FileCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{paidSalary.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{salaryRecords.filter((record) => record.payment_status === 'paid').length} 条记录</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待发放</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥{unpaidSalary.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{salaryRecords.filter((record) => record.payment_status === 'unpaid').length} 条记录</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>采样员</TableHead>
              <TableHead>年月</TableHead>
              <TableHead>基本工资</TableHead>
              <TableHead>岗位工资</TableHead>
              <TableHead>绩效工资</TableHead>
              <TableHead>综合得分</TableHead>
              <TableHead>系数</TableHead>
              <TableHead>应发工资</TableHead>
              <TableHead>发放状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaryRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.sampler_name || '-'}</TableCell>
                <TableCell>{record.year_month}</TableCell>
                <TableCell>¥{record.basic_salary?.toFixed(2)}</TableCell>
                <TableCell>¥{record.position_salary?.toFixed(2)}</TableCell>
                <TableCell>¥{record.performance_salary?.toFixed(2)}</TableCell>
                <TableCell>{record.veto ? '一票否决' : record.comprehensive_score?.toFixed(2)}</TableCell>
                <TableCell>{record.comprehensive_coefficient?.toFixed(2)}</TableCell>
                <TableCell className="font-semibold text-green-600">¥{record.total_salary?.toFixed(2)}</TableCell>
                <TableCell>{getPaymentStatusBadge(record.payment_status)}</TableCell>
                <TableCell className="text-right">
                  {record.payment_status === 'unpaid' && (
                    <Button variant="ghost" size="sm" onClick={() => handlePay(record.id)}>
                      确认发放
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
