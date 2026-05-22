import { useEffect, useState } from 'react';
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
  BarChart3,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Mail,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ExportFormat = 'pdf' | 'excel' | 'csv';

interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  date: string;
  format: string;
  status: 'queued' | 'sent' | 'failed';
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'analytics' | 'squad' | 'custom';
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'team-performance',
    name: 'Team Performance Report',
    description: 'Your squad analytics, player stats, and performance metrics',
    icon: BarChart3,
    category: 'analytics',
  },
  {
    id: 'injury-analysis',
    name: 'Injury Analysis Report',
    description: 'Injury risk distribution and player risk assessment for your club',
    icon: FileText,
    category: 'analytics',
  },
  {
    id: 'market-value',
    name: 'Market Value Report',
    description: 'Player valuations and market trends for your squad',
    icon: TrendingUp,
    category: 'analytics',
  },
  {
    id: 'player-squad',
    name: 'Player Squad Report',
    description: 'Full roster with physical profiles and key metrics for your club',
    icon: FileSpreadsheet,
    category: 'squad',
  },
];

export default function Reports() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  useEffect(() => {
    const loadRecentReports = async () => {
      const response = await apiService.getRecentReportRequests();
      if (!response.data) return;
      const mapped = response.data.requests.map((request) => ({
        id: request.id,
        templateId: request.templateId,
        name: reportTemplates.find((t) => t.id === request.templateId)?.name || request.templateId,
        date: request.createdAt,
        format: String(request.format || '').toUpperCase(),
        status: request.status,
      }));
      setRecentReports(mapped);
    };

    loadRecentReports();
  }, []);

  const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const downloadBlob = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDateRangeLabel = () => {
    if (dateRange !== 'custom') return `Last ${dateRange}`;
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    return 'Custom range';
  };

  const addRecentReport = (templateId: string, reportName: string, selectedFormat: ExportFormat) => {
    const next: GeneratedReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      templateId,
      name: reportName,
      date: new Date().toISOString(),
      format: selectedFormat.toUpperCase(),
      status: 'sent',
    };
    setRecentReports((prev) => [next, ...prev].slice(0, 10));
  };

  const generateReportRows = async (templateId: string) => {
    const [dashboardResponse, playersResponse, predictionsResponse] = await Promise.all([
      apiService.getAnalystDashboard(),
      apiService.getTeamPerformancePlayersReport(),
      apiService.getClubPredictionsReport(),
    ]);

    if (!dashboardResponse.data || !playersResponse.data) {
      throw new Error(
        dashboardResponse.error || playersResponse.error || 'Unable to fetch report data.'
      );
    }

    const template = reportTemplates.find((t) => t.id === templateId);
    const reportName = template?.name || 'Club Report';
    const teamName = user?.teamInfo?.name || 'My Club';

    const headerRows: Array<Array<string | number>> = [
      ['Report', reportName],
      ['Club', teamName],
      ['Generated At', new Date().toISOString()],
      ['Date Range', formatDateRangeLabel()],
      [''],
    ];

    const dashboard = dashboardResponse.data;
    const players = playersResponse.data.players;
    const injuryMap = predictionsResponse.data?.injury ?? {};
    const valueMap = predictionsResponse.data?.marketValue ?? {};

    if (templateId === 'team-performance') {
      return {
        reportName,
        rows: [
          ...headerRows,
          ['Summary Metric', 'Value'],
          ['Total Players', dashboard.totalPlayers],
          ['Total Matches', dashboard.totalMatches],
          ['Videos Analyzed', dashboard.videosAnalyzed],
          ['Injury Alerts', dashboard.injuryAlerts],
          ['Avg Risk (%)', dashboard.avgRisk],
          ['Avg Distance (m)', dashboard.avgDistance],
          ['Squad Market Value', dashboard.marketValue],
          [''],
          [
            'Player Name', 'Position', 'Age',
            'Matches', 'Goals', 'Assists', 'Tackles', 'Interceptions', 'Minutes',
            'Sprint Speed', 'Stamina', 'Strength',
            'Injury Risk (%)', 'Risk Level',
          ],
          ...players.map((p) => {
            const inj = injuryMap[p.id];
            const riskPct = inj ? Number((inj.riskProbability * 100).toFixed(1)) : 'N/A';
            const riskLevel = inj ? inj.riskLevel : 'N/A';
            return [
              p.name, p.position, p.age,
              p.stats.matches, p.stats.goals, p.stats.assists,
              p.stats.tackles, p.stats.interceptions, p.stats.minutesPlayed,
              p.physical.sprintSpeed, p.physical.stamina, p.physical.strength,
              riskPct, riskLevel,
            ];
          }),
        ],
      };
    }

    if (templateId === 'injury-analysis') {
      const riskBuckets = { low: 0, medium: 0, high: 0 };
      players.forEach((p) => {
        const inj = injuryMap[p.id];
        if (!inj) return;
        if (inj.riskLevel === 'high' || inj.riskProbability >= 0.6) riskBuckets.high += 1;
        else if (inj.riskLevel === 'medium' || inj.riskProbability >= 0.35) riskBuckets.medium += 1;
        else riskBuckets.low += 1;
      });

      return {
        reportName,
        rows: [
          ...headerRows,
          ['Summary Metric', 'Value'],
          ['Total Players', dashboard.totalPlayers],
          ['High Risk Alerts', dashboard.injuryAlerts],
          ['Avg Risk (%)', dashboard.avgRisk],
          [''],
          ['Risk Bucket', 'Count'],
          ['Low Risk', riskBuckets.low],
          ['Medium Risk', riskBuckets.medium],
          ['High Risk', riskBuckets.high],
          [''],
          ['Player Name', 'Position', 'Age', 'Injury Probability (%)', 'Risk Level'],
          ...players.map((p) => {
            const inj = injuryMap[p.id];
            const prob = inj ? Number((inj.riskProbability * 100).toFixed(1)) : 'N/A';
            const level = inj ? inj.riskLevel : 'N/A';
            return [p.name, p.position, p.age, prob, level];
          }),
        ],
      };
    }

    if (templateId === 'market-value') {
      return {
        reportName,
        rows: [
          ...headerRows,
          ['Summary Metric', 'Value'],
          ['Total Players', dashboard.totalPlayers],
          ['Squad Market Value', dashboard.marketValue],
          [''],
          [
            'Player Name', 'Position', 'Age',
            'Predicted Value (M€)', 'Value Range Min (M€)', 'Value Range Max (M€)',
            'Matches', 'Goals', 'Assists',
          ],
          ...players.map((p) => {
            const mv = valueMap[p.id];
            const val = mv ? Number(mv.predictedValue.toFixed(2)) : 'N/A';
            const min = mv ? Number(mv.valueRange.min.toFixed(2)) : 'N/A';
            const max = mv ? Number(mv.valueRange.max.toFixed(2)) : 'N/A';
            return [
              p.name, p.position, p.age,
              val, min, max,
              p.stats.matches, p.stats.goals, p.stats.assists,
            ];
          }),
        ],
      };
    }

    // player-squad (default)
    return {
      reportName,
      rows: [
        ...headerRows,
        ['Summary Metric', 'Value'],
        ['Total Players', dashboard.totalPlayers],
        ['Total Matches', dashboard.totalMatches],
        [''],
        [
          'Player Name', 'Position', 'Age',
          'Height (cm)', 'Weight (kg)', 'Sprint Speed', 'Stamina', 'Strength',
          'Matches', 'Goals', 'Assists', 'Minutes Played',
        ],
        ...players.map((p) => [
          p.name, p.position, p.age,
          p.physical.height, p.physical.weight,
          p.physical.sprintSpeed, p.physical.stamina, p.physical.strength,
          p.stats.matches, p.stats.goals, p.stats.assists, p.stats.minutesPlayed,
        ]),
      ],
    };
  };

  const exportRows = (rows: Array<Array<string | number>>, reportName: string, selectedFormat: ExportFormat) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const safeName = reportName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

    if (selectedFormat === 'csv') {
      downloadBlob(csvContent, `${safeName}_${timestamp}.csv`, 'text/csv;charset=utf-8;');
      return;
    }

    if (selectedFormat === 'excel') {
      const tsvContent = rows.map((row) => row.map((value) => String(value ?? '')).join('\t')).join('\n');
      downloadBlob(tsvContent, `${safeName}_${timestamp}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
      return;
    }

    const htmlRows = rows
      .map((row) => `<tr>${row.map((col) => `<td style="padding:6px;border:1px solid #ccc;">${String(col ?? '')}</td>`).join('')}</tr>`)
      .join('');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups to export as PDF.');
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${reportName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>${reportName}</h1>
          <table style="border-collapse: collapse; width: 100%;">${htmlRows}</table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
    try {
      if (dateRange === 'custom' && (!startDate || !endDate)) {
        throw new Error('Please provide both start and end dates for a custom range.');
      }
      if (dateRange === 'custom' && new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date cannot be after end date.');
      }
      const { rows, reportName } = await generateReportRows(selectedTemplate);
      exportRows(rows, reportName, format);
      await apiService.createReportRequest({
        templateId: selectedTemplate,
        format,
        dateRange,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: 'sent',
      }).catch(() => null);
      addRecentReport(selectedTemplate, reportName, format);
      toast({
        title: 'Report generated',
        description: `${reportName} exported successfully as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to generate report',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsGenerating(true);
    try {
      const template = reportTemplates.find((t) => t.id === templateId);
      const { rows, reportName } = await generateReportRows(templateId);
      exportRows(rows, reportName, format);
      await apiService.createReportRequest({
        templateId,
        format,
        dateRange,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: 'sent',
      }).catch(() => null);
      addRecentReport(templateId, reportName, format);
      toast({
        title: 'Export complete',
        description: `${template?.name || 'Report'} extracted as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Could not export report.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmailReport = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Select a template first',
        description: 'Choose a report template before emailing.',
        variant: 'destructive',
      });
      return;
    }

    if (dateRange === 'custom' && (!startDate || !endDate)) {
      toast({
        title: 'Missing date range',
        description: 'Please provide both start and end dates for a custom range.',
        variant: 'destructive',
      });
      return;
    }

    if (dateRange === 'custom' && new Date(startDate) > new Date(endDate)) {
      toast({
        title: 'Invalid date range',
        description: 'Start date cannot be after end date.',
        variant: 'destructive',
      });
      return;
    }

    setIsEmailing(true);
    try {
      const response = await apiService.queueReportEmail({
        templateId: selectedTemplate,
        format,
        dateRange,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (response.error || !response.data) {
        toast({
          title: 'Failed to queue email',
          description: response.error || 'Unknown server error',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Email queued',
        description: `Request ${response.data.requestId} is queued with status "${response.data.status}".`,
      });
      const templateName = reportTemplates.find((t) => t.id === selectedTemplate)?.name || selectedTemplate;
      setRecentReports((prev) =>
        [
          {
            id: response.data.requestId,
            templateId: selectedTemplate,
            name: templateName,
            date: new Date().toISOString(),
            format: format.toUpperCase(),
            status: 'queued' as const,
          },
          ...prev,
        ].slice(0, 25)
      );
    } catch (error) {
      toast({
        title: 'Failed to queue email',
        description: error instanceof Error ? error.message : 'Unknown error while queueing email report.',
        variant: 'destructive',
      });
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Reports"
        subtitle={`Generate and export reports for ${user?.teamInfo?.name || 'your club'}`}
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
                  {reportTemplates.map((template) => (
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
              <Button
                variant="outline"
                onClick={handleEmailReport}
                disabled={isGenerating || isEmailing || !selectedTemplate}
              >
                <Mail className="w-4 h-4 mr-2" />
                {isEmailing ? 'Queueing Email...' : 'Email Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Templates */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTemplates.map((template) => {
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
                        disabled={isGenerating}
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
              {(recentReports.length
                ? recentReports
                : [
                    {
                      id: 'seed-1',
                      templateId: '',
                      name: 'No reports generated yet',
                      date: new Date().toISOString(),
                      format: '—',
                      status: 'sent' as const,
                    },
                  ]
              ).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.date).toLocaleDateString()} • {report.format} • {report.status}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isGenerating || !report.templateId}
                    onClick={() => {
                      if (report.templateId) {
                        handleExport(report.templateId);
                      }
                    }}
                  >
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
