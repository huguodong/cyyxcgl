import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Save } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface SalaryConfig {
  id: number;
  config_name: string;
  config_key: string;
  config_value: number;
  description: string;
}

export function SalaryConfigList() {
  const [configs, setConfigs] = useState<SalaryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<SalaryConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    config_value: 0,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const data = await api.salaryConfigs.list();
      setConfigs(data || []);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: SalaryConfig) => {
    setEditingConfig(config);
    setFormData({
      config_value: config.config_value,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;

    try {
      await api.salaryConfigs.update(editingConfig.id, formData);
      toast.success('配置已更新');
      setDialogOpen(false);
      setEditingConfig(null);
      loadConfigs();
    } catch (error) {
      toast.error('更新失败');
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  const getConfigDisplay = (key: string) => {
    const displays: Record<string, { title: string; desc: string; unit: string }> = {
      basic_salary_standard: { title: '基本工资标准', desc: '制度默认基本工资；低于当地最低工资时按最低工资执行', unit: '元/月' },
      local_minimum_wage: { title: '当地最低工资', desc: '适用地现行最低工资标准', unit: '元/月' },
      performance_pool_ratio: { title: '绩效池提取比例', desc: '小组有效业绩提取为绩效工资池的比例', unit: '%' },
      equal_share_ratio: { title: '均分绩效比例', desc: '绩效工资池中按人数均分的比例', unit: '%' },
      differential_share_ratio: { title: '差异绩效比例', desc: '绩效工资池中按工作量占比分配的比例', unit: '%' },
      default_required_attendance_days: { title: '默认应出勤天数', desc: '月度出勤折算率默认分母，可在计算时覆盖', unit: '天' },
      position_salary_level_1: { title: '一级岗位工资', desc: '能在带教下完成基础采样辅助工作', unit: '元/月' },
      position_salary_level_2: { title: '二级岗位工资', desc: '能独立完成常规采样任务', unit: '元/月' },
      position_salary_level_3: { title: '三级岗位工资', desc: '能处理复杂、夜间或应急任务', unit: '元/月' },
      position_salary_level_4: { title: '四级岗位工资', desc: '能带队作业、协调现场并承担带教责任', unit: '元/月' },
    };
    return displays[key] || { title: key, desc: '', unit: '' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">薪酬配置管理</h1>
        <p className="text-muted-foreground">配置薪酬计算的各项参数</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => {
          const display = getConfigDisplay(config.config_key);
          return (
            <Card key={config.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base">{display.title}</CardTitle>
                  <CardDescription className="text-xs">{display.desc}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {config.config_value.toFixed(2)}
                  <span className="text-sm text-muted-foreground ml-1">{display.unit}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  键名：{config.config_key}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑薪酬配置</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{editingConfig ? getConfigDisplay(editingConfig.config_key).title : '配置项'}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                {editingConfig ? getConfigDisplay(editingConfig.config_key).desc : ''}
              </p>
            </div>
            <div>
              <Label htmlFor="config_value">配置值</Label>
              <Input
                id="config_value"
                type="number"
                step="0.01"
                value={formData.config_value}
                onChange={(e) => setFormData({ ...formData, config_value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
