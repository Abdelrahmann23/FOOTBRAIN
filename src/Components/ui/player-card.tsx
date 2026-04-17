import { PlayerData } from '@/services/mockAIService';
import { cn } from '@/lib/utils';
import { User, MapPin, Flag } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerData;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

export function PlayerCard({ player, onClick, isSelected, compact }: PlayerCardProps) {
  if (compact) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
          isSelected 
            ? "border-primary bg-primary/5 ai-border-glow" 
            : "border-border hover:border-primary/30 bg-card"
        )}
      >
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{player.name}</p>
          <p className="text-xs text-muted-foreground">
            #{player.shirtNumber ?? player.globalId ?? '-'} • {player.position} • {player.team}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "stat-card cursor-pointer",
        isSelected && "border-primary ai-border-glow"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{player.name}</h3>
          <p className="text-primary font-medium">{player.position}</p>
          <p className="text-xs text-muted-foreground mt-1">T-shirt: #{player.shirtNumber ?? player.globalId ?? '-'}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {player.team}
            </span>
            <span className="flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" />
              {player.nationality}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{player.stats.matches}</p>
          <p className="text-xs text-muted-foreground">Matches</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{player.stats.goals}</p>
          <p className="text-xs text-muted-foreground">Goals</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{player.stats.assists}</p>
          <p className="text-xs text-muted-foreground">Assists</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{player.age}</p>
          <p className="text-xs text-muted-foreground">Age</p>
        </div>
      </div>
    </div>
  );
}
