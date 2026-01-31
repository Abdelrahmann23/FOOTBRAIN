import { RiskBadge } from '@/components/ui/risk-badge';
import { mockPlayers } from '@/services/mockAIService';

interface PlayerRisk {
  name: string;
  position: string;
  team: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
}

const mockRisks: PlayerRisk[] = [
  { name: 'Giovanni Rossi', position: 'Forward', team: 'AC Milan', riskLevel: 'high', riskScore: 72 },
  { name: 'Marcus Sterling', position: 'Forward', team: 'Manchester United', riskLevel: 'medium', riskScore: 45 },
  { name: 'Jamal Okonkwo', position: 'Defender', team: 'Bayern Munich', riskLevel: 'medium', riskScore: 38 },
  { name: 'Kai Muller', position: 'Midfielder', team: 'Borussia Dortmund', riskLevel: 'low', riskScore: 22 },
  { name: 'Lucas Fernandez', position: 'Midfielder', team: 'Real Madrid', riskLevel: 'low', riskScore: 15 },
];

export function RiskOverview() {
  return (
    <div className="stat-card">
      <h3 className="font-semibold mb-4">Injury Risk Overview</h3>
      <div className="space-y-3">
        {mockRisks.map((player, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.position} • {player.team}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-medium">{player.riskScore}%</span>
              <RiskBadge level={player.riskLevel} showLabel={false} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
