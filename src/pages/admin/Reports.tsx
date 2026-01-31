import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Download,
  Calendar,
  BarChart3,
  Users,
  TrendingUp,
  FileSpreadsheet,
  FilePdf,
  Mail
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'analytics' | 'users' | 'system' | 'custom';
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'user-activity',
    name: 'User Activity Report',
    description: 'Comprehensive user activity and engagement metrics',
    icon: Users,
    category: 'users',
  },
  {
    id: 'team-performance',
    name: 'Team Performance Report',
    description: 'Team analytics, player stats, and performance metrics',
    icon: BarChart3,
    category: 'analytics',
  },
  {
    id: 'system-usage',
    name: 'System Usage Report',
    description: 'Platform usage statistics and resource consumption',
    icon: TrendingUp,
    category: 'system',
  },
  {
    id: 'injury-analysis',
    name: 'Injury Analysis Report',
    description: 'Injury predictions and risk assessment across teams',
    icon: FileText,
    category: 'analytics',
  },
  {
    id: 'market-value',
    name: 'Market Value Report',
    description: 'Player valuations and market trends',
    icon: TrendingUp,
    category: 'analytics',
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Create a custom report with selected metrics',
    icon: FileSpreadsheet,
    category: 'custom',
  },
];

export default function Reports() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Error',
        description: 'Please select a report template',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: 'Report generated',
      description: 'Your report has been generated successfully and is ready for download.',
    });
    setIsGenerating(false);
  };

  const handleExport = (templateId: string) => {
    toast({
      title: 'Exporting report',
      description: `Exporting ${reportTemplates.find(t => t.id === templateId)?.name}...`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Reports" 
        subtitle="Generate and export system reports"
      />
      
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Report Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select a template and configure report parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>Report Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a report template" />
                </SelectTrigger>
                <SelectContent>
                  {reportTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Export Format</Label>
              <Select value={format} onValueChange={(value: any) => setFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleGenerate} disabled={isGenerating || !selectedTemplate}>
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Email Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Templates */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTemplates.map(template => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExport(template.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="mt-4">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Your recently generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'User Activity Report - January 2025', date: '2025-01-20', format: 'PDF' },
                { name: 'Team Performance Report - Q4 2024', date: '2025-01-15', format: 'Excel' },
                { name: 'System Usage Report - December 2024', date: '2025-01-10', format: 'PDF' },
              ].map((report, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Generated on {new Date(report.date).toLocaleDateString()} • {report.format}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
