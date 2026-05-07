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
      piece_rate_base: { title: '计件基础单价', desc: '每个样本的基础计件工资', unit: '元' },
      hourly_rate: { title: '工时工资单价', desc: '正常工时的每小时工资', unit: '元/小时' },
      overtime_multiplier: { title: '加班系数', desc: '工作日加班工资的倍数', unit: '倍' },
      weekend_multiplier: { title: '周末系数', desc: '周末加班工资的倍数', unit: '倍' },
      holiday_multiplier: { title: '节假日系数', desc: '法定节假日加班工资的倍数', unit: '倍' },
      performance_ratio: { title: '绩效比例', desc: '绩效奖金占基础工资的比例', unit: '%' },
      tax_rate: { title: '税率', desc: '个人所得税税率', unit: '%' },
      social_security_ratio: { title: '社保比例', desc: '个人社保缴纳比例', unit: '%' },
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
