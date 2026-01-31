import { Brain, Heart, TrendingUp, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'injury' | 'value' | 'video' | 'ai';
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  { id: '1', type: 'injury', title: 'Injury Risk Alert', description: 'Giovanni Rossi flagged as high risk', time: '2 min ago' },
  { id: '2', type: 'video', title: 'Video Analysis Complete', description: 'Match vs Chelsea analyzed', time: '15 min ago' },
  { id: '3', type: 'value', title: 'Value Update', description: 'Marcus Sterling value increased 12%', time: '1 hour ago' },
  { id: '4', type: 'ai', title: 'Model Retrained', description: 'Injury prediction model updated', time: '3 hours ago' },
  { id: '5', type: 'injury', title: 'Recovery Complete', description: 'Lucas Fernandez cleared to play', time: '5 hours ago' },
];

const iconMap = {
  injury: Heart,
  value: TrendingUp,
  video: Video,
  ai: Brain,
};

const colorMap = {
  injury: 'text-risk-high bg-risk-high/10',
  value: 'text-risk-low bg-risk-low/10',
  video: 'text-primary bg-primary/10',
  ai: 'text-primary bg-primary/10',
};

export function RecentActivity() {
  return (
    <div className="stat-card">
      <h3 className="font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = iconMap[activity.type];
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                colorMap[activity.type]
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
