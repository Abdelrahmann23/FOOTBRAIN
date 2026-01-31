import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/stat-card';
import { RiskOverview } from '@/components/dashboard/RiskOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { Users, Heart, TrendingUp, Video, Brain, Activity } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header 
        title="Dashboard" 
        subtitle="AI-powered football analytics overview"
      />
      
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Players"
            value={128}
            subtitle="Across 12 teams"
            icon={Users}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Injury Alerts"
            value={7}
            subtitle="3 high risk"
            icon={Heart}
            variant="danger"
          />
          <StatCard
            title="Value Predictions"
            value="€2.4B"
            subtitle="Total portfolio"
            icon={TrendingUp}
            variant="success"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Videos Analyzed"
            value={43}
            subtitle="This month"
            icon={Video}
            variant="primary"
          />
        </div>

        {/* AI Model Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Model Accuracy"
            value="91.2%"
            subtitle="Injury prediction"
            icon={Brain}
            variant="primary"
          />
          <StatCard
            title="Predictions Made"
            value="2,847"
            subtitle="Last 30 days"
            icon={Activity}
          />
        </div>

        {/* Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <RiskOverview />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          
          {/* Quick Actions */}
          <div className="stat-card">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-left group">
                <Heart className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">Run Injury Scan</p>
                <p className="text-xs text-muted-foreground">Analyze all players</p>
              </button>
              <button className="p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group">
                <TrendingUp className="w-6 h-6 text-risk-low mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">Update Values</p>
                <p className="text-xs text-muted-foreground">Recalculate market</p>
              </button>
              <button className="p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group">
                <Video className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">Upload Video</p>
                <p className="text-xs text-muted-foreground">Analyze footage</p>
              </button>
              <button className="p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left group">
                <Brain className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-medium text-sm">Retrain Models</p>
                <p className="text-xs text-muted-foreground">Update AI</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
