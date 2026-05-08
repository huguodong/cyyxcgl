import { useEffect, useMemo, useState } from 'react';
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
  distribution_count: number;
  performance_pool: number;
  equal_performance: number;
  differential_performance: number;
  workload_points: number;
  group_workload_points: number;
  workload_share: number;
  attendance_days: number;
  required_attendance_days: number;
  attendance_rate: number;
  quality_score: number;
  timeliness_score: number;
  equipment_score: number;
  comprehensive_score: number;
  comprehensive_coefficient: number;
  performance_salary: number;
  other_pay: number;
  veto: number;
  veto_reason?: string;
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
  internal_complaints: 0,
  external_complaints: 0,
  record_required_key_items: 4,
  record_required_general_items: 6,
  record_missing_key_items: 0,
  record_missing_general_items: 0,
  record_accuracy_key_items: 4,
  record_accuracy_general_items: 4,
  record_error_key_items: 0,
  record_error_general_items: 0,
  punctual_required_count: 0,
  late_count: 0,
  handover_required_count: 0,
  overdue_count: 0,
  maintenance_check_count: 4,
  maintenance_fail_count: 0,
  consumable_usage_count: 0,
  consumable_waste_count: 0,
  other_pay: 0,
  veto: false,
  veto_reason: '',
  notes: '',
};

function toNumber(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function formatMoney(value: number | undefined): string {
  return `¥${toNumber(value).toFixed(2)}`;
}

function scoreCoefficient(score: number, veto: boolean): number {
  if (veto) return 0;
  if (score >= 100) return 1.05;
  if (score >= 95) return 1;
  if (score >= 90) return 0.95;
  if (score >= 85) return 0.9;
  if (score >= 80) return 0.8;
  return 0.6;
}

function rate(total: number, failed: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, ((total - failed) / total) * 100));
}

function thresholdScore(value: number, thresholds: Array<[number, number]>): number {
  for (const [minimum, score] of thresholds) {
    if (value >= minimum) return score;
  }
  return 0;
}

function complaintScore(count: number, fullScore: number): number {
  if (count <= 0) return fullScore;
  if (count === 1) return fullScore === 15 ? 10 : 15;
  if (count === 2) return 5;
  return 0;
}

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

  const preview = useMemo(() => {
    const completenessTotal = formData.record_required_key_items * 3 + formData.record_required_general_items;
    const completenessDeduction = formData.record_missing_key_items * 3 + formData.record_missing_general_items;
    const completenessRate = completenessTotal > 0 ? Math.max(0, Math.min(100, ((completenessTotal - completenessDeduction) / completenessTotal) * 100)) : 100;
    const completenessScore = thresholdScore(completenessRate, [[99, 30], [97, 25], [95, 20], [90, 10]]);

    const accuracyTotal = formData.record_accuracy_key_items * 3 + formData.record_accuracy_general_items;
    const accuracyDeduction = formData.record_error_key_items * 3 + formData.record_error_general_items;
    const accuracyRate = accuracyTotal > 0 ? Math.max(0, Math.min(100, ((accuracyTotal - accuracyDeduction) / accuracyTotal) * 100)) : 100;
    const accuracyScore = thresholdScore(accuracyRate, [[99.5, 30], [98, 25], [96, 20], [93, 10]]);

    const qualityScore = complaintScore(formData.internal_complaints, 15)
      + complaintScore(formData.external_complaints, 25)
      + completenessScore
      + accuracyScore;
    const punctualityRate = rate(formData.punctual_required_count, formData.late_count);
    const handoverRate = rate(formData.handover_required_count, formData.overdue_count);
    const timelinessScore = thresholdScore(punctualityRate, [[98, 50], [95, 45], [90, 35], [85, 20]])
      + thresholdScore(handoverRate, [[98, 50], [95, 45], [90, 35], [85, 20]]);
    const maintenanceScore = Math.max(0, 60 - formData.maintenance_fail_count * 15);
    const wasteRate = formData.consumable_usage_count > 0 ? Math.max(0, Math.min(100, (formData.consumable_waste_count / formData.consumable_usage_count) * 100)) : 0;
    const wasteScore = formData.consumable_usage_count <= 0
      ? 40
      : thresholdScore(100 - wasteRate, [[99, 40], [98, 35], [97, 25], [95, 10]]);
    const equipmentScore = maintenanceScore + wasteScore;
    const comprehensiveScore = qualityScore * 0.5 + timelinessScore * 0.4 + equipmentScore * 0.1;

    return {
      qualityScore,
      timelinessScore,
      equipmentScore,
      comprehensiveScore,
      coefficient: scoreCoefficient(comprehensiveScore, formData.veto),
      completenessRate,
      accuracyRate,
      punctualityRate,
      handoverRate,
      wasteRate,
    };
  }, [formData]);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.salaries.calculate(formData);
      setCalculateDialogOpen(false);
      loadData();
      alert('薪酬计算成功');
    } catch (error) {
      console.error('Failed to calculate salary:', error);
      alert('计算失败');
    }
  };

  const handlePay = async (id: number) => {
    try {
      await api.salaries.pay(id);
      loadData();
    } catch {
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
      '采样员月度薪酬记录',
      [
        { key: 'sampler_name', label: '采样员' },
        { key: 'year_month', label: '考核月份' },
        { key: 'group_revenue', label: '小组有效业绩' },
        { key: 'performance_pool', label: '小组绩效工资池' },
        { key: 'workload_points', label: '个人有效作业点数' },
        { key: 'group_workload_points', label: '小组有效作业点数' },
        { key: 'attendance_rate', label: '出勤折算率' },
        { key: 'quality_score', label: '质量得分' },
        { key: 'timeliness_score', label: '时效得分' },
        { key: 'equipment_score', label: '设备得分' },
        { key: 'comprehensive_score', label: '综合得分' },
        { key: 'comprehensive_coefficient', label: '综合系数' },
        { key: 'performance_salary', label: '个人绩效工资' },
        { key: 'total_salary', label: '应发工资' },
        { key: 'payment_status', label: '发放状态' },
      ]
    );
  };

  const getPaymentStatusBadge = (status: string) => (
    <Badge variant={status === 'paid' ? 'default' : 'secondary'}>
      {status === 'paid' ? '已发放' : '未发放'}
    </Badge>
  );

  const numberInput = (id: keyof typeof defaultFormData, label: string, options: { step?: string; min?: string } = {}) => (
    <div>
      <Label htmlFor={String(id)}>{label}</Label>
      <Input
        id={String(id)}
        type="number"
        step={options.step ?? '1'}
        min={options.min ?? '0'}
        value={String(formData[id])}
        onChange={(event) => setFormData({ ...formData, [id]: Number(event.target.value) || 0 })}
      />
    </div>
  );

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">薪酬管理</h1>
          <p className="text-muted-foreground mt-1">按 V3 制度计算基本工资、岗位工资、绩效工资、综合系数和出勤折算。</p>
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
                计算月度薪酬
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>采样员月度考核与薪酬核算</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCalculate} className="space-y-6">
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">基础信息</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label htmlFor="sampler_id">采样员</Label>
                      <select
                        id="sampler_id"
                        value={formData.sampler_id}
                        onChange={(event) => setFormData({ ...formData, sampler_id: parseInt(event.target.value, 10) || 0 })}
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
                      <Label htmlFor="year_month">考核月份</Label>
                      <Input
                        id="year_month"
                        type="month"
                        value={formData.year_month}
                        onChange={(event) => setFormData({ ...formData, year_month: event.target.value })}
                        required
                      />
                    </div>
                    {numberInput('group_revenue', '小组当月有效业绩', { step: '0.01' })}
                    {numberInput('distribution_count', '绩效分配人数')}
                    {numberInput('workload_points', '个人有效作业点数', { step: '0.01' })}
                    {numberInput('group_workload_points', '小组有效作业点数', { step: '0.01' })}
                    {numberInput('attendance_days', '实际计薪在岗天数', { step: '0.5' })}
                    {numberInput('required_attendance_days', '应出勤天数', { step: '0.5' })}
                    {numberInput('other_pay', '其他应发项目', { step: '0.01', min: '' })}
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">质量评分</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {numberInput('internal_complaints', '内部投诉次数')}
                    {numberInput('external_complaints', '外部投诉次数')}
                    {numberInput('record_required_key_items', '记录完整：关键必填项')}
                    {numberInput('record_required_general_items', '记录完整：一般必填项')}
                    {numberInput('record_missing_key_items', '关键缺失项')}
                    {numberInput('record_missing_general_items', '一般缺失项')}
                    {numberInput('record_accuracy_key_items', '记录准确：关键准确项')}
                    {numberInput('record_accuracy_general_items', '记录准确：一般准确项')}
                    {numberInput('record_error_key_items', '关键错误项')}
                    {numberInput('record_error_general_items', '一般错误项')}
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">时效评分</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {numberInput('punctual_required_count', '应到场次数')}
                    {numberInput('late_count', '迟到次数')}
                    {numberInput('handover_required_count', '应交接次数')}
                    {numberInput('overdue_count', '逾期交接次数')}
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">设备评分</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {numberInput('maintenance_check_count', '周检查次数')}
                    {numberInput('maintenance_fail_count', '维护不合格次数')}
                    {numberInput('consumable_usage_count', '耗材领用次数')}
                    {numberInput('consumable_waste_count', '可归责浪费次数')}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      id="veto"
                      type="checkbox"
                      checked={formData.veto}
                      onChange={(event) => setFormData({ ...formData, veto: event.target.checked })}
                    />
                    <Label htmlFor="veto">触发一票否决，当月个人绩效工资为 0</Label>
                  </div>
                  {formData.veto && (
                    <div>
                      <Label htmlFor="veto_reason">一票否决事项说明</Label>
                      <Input
                        id="veto_reason"
                        value={formData.veto_reason}
                        onChange={(event) => setFormData({ ...formData, veto_reason: event.target.value })}
                      />
                    </div>
                  )}
                </section>

                <div className="grid gap-3 rounded-md bg-muted p-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                  <div>质量得分：{preview.qualityScore.toFixed(2)}</div>
                  <div>时效得分：{preview.timelinessScore.toFixed(2)}</div>
                  <div>设备得分：{preview.equipmentScore.toFixed(2)}</div>
                  <div>综合系数：{preview.coefficient.toFixed(2)}</div>
                  <div>记录完整率：{preview.completenessRate.toFixed(2)}%</div>
                  <div>记录准确率：{preview.accuracyRate.toFixed(2)}%</div>
                  <div>到场准时率：{preview.punctualityRate.toFixed(2)}%</div>
                  <div>交接及时率：{preview.handoverRate.toFixed(2)}%</div>
                  <div>耗材浪费率：{preview.wasteRate.toFixed(2)}%</div>
                  <div>综合得分：{preview.comprehensiveScore.toFixed(2)}</div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCalculateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">保存核算结果</Button>
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
            <div className="text-3xl font-bold">{formatMoney(totalSalary)}</div>
            <p className="text-xs text-muted-foreground">基本工资 + 岗位工资 + 绩效工资 + 其他应发项目</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已发放</CardTitle>
            <FileCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMoney(paidSalary)}</div>
            <p className="text-xs text-muted-foreground">{salaryRecords.filter((record) => record.payment_status === 'paid').length} 条记录</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待发放</CardTitle>
            <Clock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMoney(unpaidSalary)}</div>
            <p className="text-xs text-muted-foreground">{salaryRecords.filter((record) => record.payment_status === 'unpaid').length} 条记录</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>采样员</TableHead>
              <TableHead>月份</TableHead>
              <TableHead>绩效池</TableHead>
              <TableHead>作业占比</TableHead>
              <TableHead>出勤折算</TableHead>
              <TableHead>质量/时效/设备</TableHead>
              <TableHead>综合得分</TableHead>
              <TableHead>绩效工资</TableHead>
              <TableHead>应发工资</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaryRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.sampler_name || '-'}</TableCell>
                <TableCell>{record.year_month}</TableCell>
                <TableCell>{formatMoney(record.performance_pool)}</TableCell>
                <TableCell>{(toNumber(record.workload_share) * 100).toFixed(2)}%</TableCell>
                <TableCell>{(toNumber(record.attendance_rate) * 100).toFixed(2)}%</TableCell>
                <TableCell>{record.quality_score}/{record.timeliness_score}/{record.equipment_score}</TableCell>
                <TableCell>{record.veto ? '一票否决' : `${record.comprehensive_score?.toFixed(2)} × ${record.comprehensive_coefficient?.toFixed(2)}`}</TableCell>
                <TableCell>{formatMoney(record.performance_salary)}</TableCell>
                <TableCell className="font-semibold text-green-600">{formatMoney(record.total_salary)}</TableCell>
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
