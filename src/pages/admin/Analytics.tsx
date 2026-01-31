import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { getAllUsers } from '@/services/userService';
import { User } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity, 
  Video, 
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const [users, setUsers] = useState<User[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    try {
      const allUsers = getAllUsers();
      setUsers(allUsers.filter(u => u.role === 'user'));
    } catch (error) {
      console.error('Error loading users for analytics:', error);
      setUsers([]);
    }
  }, []);

  // Calculate analytics data
  const totalUsers = users.length;
  const totalPlayers = users.reduce((sum, u) => sum + (u.teamInfo?.totalPlayers || 0), 0);
  const totalInjuries = users.reduce((sum, u) => sum + (u.teamInfo?.injuryAlerts || 0), 0);
  const totalVideos = users.reduce((sum, u) => sum + (u.teamInfo?.videosAnalyzed || 0), 0);
  const avgMarketValue = users.reduce((sum, u) => {
    const marketValue = u.teamInfo?.marketValue || '€0M';
    const value = parseFloat(marketValue.replace(/[€M]/g, '') || '0');
    return sum + value;
  }, 0) / (users.length || 1);

  // Team performance data
  const teamPerformance = users
    .filter(u => u.teamInfo)
    .map(u => ({
      name: u.teamInfo!.name,
      players: u.teamInfo!.totalPlayers,
      injuries: u.teamInfo!.injuryAlerts,
      videos: u.teamInfo!.videosAnalyzed,
      marketValue: parseFloat((u.teamInfo!.marketValue || '€0M').replace(/[€M]/g, '') || '0'),
    }))
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 10);

  // Usage trends (mock data)
  const usageTrends = [
    { month: 'Jan', users: 12, videos: 45, players: 280 },
    { month: 'Feb', users: 15, videos: 52, players: 310 },
    { month: 'Mar', users: 18, videos: 68, players: 340 },
    { month: 'Apr', users: 20, videos: 75, players: 365 },
    { month: 'May', users: 22, videos: 82, players: 390 },
    { month: 'Jun', users: 25, videos: 95, players: 420 },
  ];

  // Injury distribution
  const injuryDistribution = [
    { name: 'Low Risk', value: users.filter(u => (u.teamInfo?.injuryAlerts || 0) === 0).length },
    { name: 'Medium Risk', value: users.filter(u => (u.teamInfo?.injuryAlerts || 0) > 0 && (u.teamInfo?.injuryAlerts || 0) <= 2).length },
    { name: 'High Risk', value: users.filter(u => (u.teamInfo?.injuryAlerts || 0) > 2).length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Analytics" 
        subtitle="System-wide analytics and performance insights"
      />
      
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={(value: 'week' | 'month' | 'year') => setTimeRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={totalUsers}
            subtitle="Active accounts"
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Total Players"
            value={totalPlayers}
            subtitle="Across all teams"
            icon={Users}
          />
          <StatCard
            title="Videos Analyzed"
            value={totalVideos}
            subtitle={`${timeRange} period`}
            icon={Video}
            variant="success"
          />
          <StatCard
            title="Avg Market Value"
            value={`€${avgMarketValue.toFixed(1)}M`}
            subtitle="Per team"
            icon={TrendingUp}
            variant="primary"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Trends */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Usage Trends</h3>
                <p className="text-sm text-muted-foreground">Growth over time</p>
              </div>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Users" />
                <Line type="monotone" dataKey="videos" stroke="#10b981" strokeWidth={2} name="Videos" />
                <Line type="monotone" dataKey="players" stroke="#f59e0b" strokeWidth={2} name="Players" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Injury Distribution */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Injury Risk Distribution</h3>
                <p className="text-sm text-muted-foreground">Teams by risk level</p>
              </div>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={injuryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {injuryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Performance Comparison */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Top Teams by Market Value</h3>
              <p className="text-sm text-muted-foreground">Performance comparison</p>
            </div>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={teamPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="marketValue" fill="#3b82f6" name="Market Value (€M)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Team Stats Table */}
        <div className="stat-card">
          <h3 className="font-semibold text-lg mb-4">Team Performance Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Team</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Players</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Injuries</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Videos</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Market Value</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((team, index) => (
                  <tr key={index} className="border-b border-border hover:bg-secondary/50">
                    <td className="py-3 px-4 font-medium">{team.name}</td>
                    <td className="py-3 px-4 text-right">{team.players}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={team.injuries > 2 ? 'text-destructive' : team.injuries > 0 ? 'text-warning' : 'text-foreground'}>
                        {team.injuries}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{team.videos}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">€{team.marketValue}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
