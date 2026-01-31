import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { PlayerCard } from '@/components/ui/player-card';
import { RiskBadge } from '@/components/ui/risk-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { type PlayerData, type InjuryPredictionResponse } from '@/services/mockAIService';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle, Info, Play, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Physical attributes used for injury prediction (not goals/assists like market value)
const defaultPhysical = {
  age: 25,
  height: 180,
  weight: 75,
  hamstring: 70,
  sprint_speed: 32,
  training_hours: 15,
};

export default function InjuryPrediction() {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [prediction, setPrediction] = useState<InjuryPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const { user } = useAuth();

  // Physical attributes for injury model (height, weight, age, BMI, hamstring, sprint speed, training hours)
  const [age, setAge] = useState(defaultPhysical.age);
  const [height, setHeight] = useState(defaultPhysical.height);
  const [weight, setWeight] = useState(defaultPhysical.weight);
  const [hamstring, setHamstring] = useState(defaultPhysical.hamstring);
  const [sprintSpeed, setSprintSpeed] = useState(defaultPhysical.sprint_speed);
  const [trainingHours, setTrainingHours] = useState(defaultPhysical.training_hours);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bmi = height && weight ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '—';

  // Load players and pre-fill physical from selected player
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!user) {
        setPlayers([]);
        return;
      }
      try {
        const response = await apiService.getMyPlayers();
        if (response.error || !response.data) {
          setPlayers([]);
          return;
        }
        setPlayers(response.data.players as PlayerData[]);
      } catch {
        setPlayers([]);
      }
    };
    fetchPlayers();
  }, [user]);

  useEffect(() => {
    if (!selectedPlayer) return;
    setAge(selectedPlayer.age ?? defaultPhysical.age);
    const ph = selectedPlayer.physical;
    if (ph) {
      setHeight(ph.height ?? defaultPhysical.height);
      setWeight(ph.weight ?? defaultPhysical.weight);
      setSprintSpeed(ph.sprintSpeed ?? defaultPhysical.sprint_speed);
    }
  }, [selectedPlayer]);

  const runPrediction = async () => {
    setIsLoading(true);
    setPrediction(null);
    setErrorMessage(null);
    try {
      const response = await apiService.predictInjury({
        playerId: selectedPlayer?.id,
        physical: {
          age,
          height,
          weight,
          hamstring,
          sprint_speed: sprintSpeed,
          training_hours: trainingHours,
        },
      });
      if (response.error) {
        setErrorMessage(response.error);
        return;
      }
      if (response.data) setPrediction(response.data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Injury Prediction"
        subtitle="AI injury risk from physical attributes (height, weight, age, BMI, hamstring, sprint speed, training hours)"
      />

      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player selection (optional – pre-fills physical) */}
          <div className="space-y-4">
            <div className="stat-card">
              <h3 className="font-semibold mb-4">Select Player (optional)</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Pre-fills age, height, weight & sprint speed. Injury model uses physical data only, not goals/assists.
              </p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players in your team. Enter values manually below.</p>
                ) : (
                  players.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      compact
                      isSelected={selectedPlayer?.id === player.id}
                      onClick={() => setSelectedPlayer(player)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Physical attributes for injury prediction */}
            <div className="stat-card">
              <h3 className="font-semibold mb-4">Physical Attributes</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Used only for injury risk. Market value uses goals, assists & performance stats instead.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Age</label>
                  <Input
                    type="number"
                    min={16}
                    max={45}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Height (cm)</label>
                  <Input
                    type="number"
                    min={150}
                    max={220}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Weight (kg)</label>
                  <Input
                    type="number"
                    min={50}
                    max={120}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  BMI: <span className="font-mono text-foreground">{bmi}</span> (computed)
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm text-muted-foreground">Hamstring (0–100)</label>
                    <span className="text-sm font-mono">{hamstring}</span>
                  </div>
                  <Slider
                    value={[hamstring]}
                    onValueChange={([v]) => setHamstring(v)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Sprint speed (km/h or 0–100)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={sprintSpeed}
                    onChange={(e) => setSprintSpeed(Number(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm text-muted-foreground">Training hours/week</label>
                    <span className="text-sm font-mono">{trainingHours}</span>
                  </div>
                  <Slider
                    value={[trainingHours]}
                    onValueChange={([v]) => setTrainingHours(v)}
                    max={40}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                {errorMessage}
              </div>
            )}

            <Button
              onClick={runPrediction}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Injury Prediction
            </Button>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedPlayer && !prediction && (
              <div className="stat-card flex flex-col items-center justify-center py-16 text-center">
                <Info className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Select a Player</h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a player from the list and run the AI prediction model to assess their injury risk.
                </p>
              </div>
            )}

            {isLoading && (
              <div className="stat-card flex flex-col items-center justify-center py-16">
                <LoadingSpinner size="lg" text="Running AI models..." />
                <p className="text-xs text-muted-foreground mt-4">
                  Analyzing with Random Forest, XGBoost, and Logistic Regression
                </p>
              </div>
            )}

            {prediction && !isLoading && (
              <>
                {/* Risk Score */}
                <div className={cn(
                  "stat-card border-2",
                  prediction.riskLevel === 'low' && "border-risk-low/30",
                  prediction.riskLevel === 'medium' && "border-risk-medium/30",
                  prediction.riskLevel === 'high' && "border-risk-high/30",
                )}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-lg">Injury Risk Assessment</h3>
                      <p className="text-sm text-muted-foreground">
                        Model confidence: {(prediction.modelConfidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <RiskBadge level={prediction.riskLevel} size="lg" />
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-secondary"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${prediction.riskProbability * 352} 352`}
                          strokeLinecap="round"
                          className={cn(
                            prediction.riskLevel === 'low' && "text-risk-low",
                            prediction.riskLevel === 'medium' && "text-risk-medium",
                            prediction.riskLevel === 'high' && "text-risk-high",
                          )}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">
                          {Math.round(prediction.riskProbability * 100)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">Risk Interpretation</h4>
                      <p className="text-sm text-muted-foreground">
                        {prediction.riskLevel === 'high' && 
                          "High probability of injury within the next 4-6 weeks. Immediate intervention recommended."}
                        {prediction.riskLevel === 'medium' && 
                          "Moderate injury risk detected. Consider adjusting training load and monitoring closely."}
                        {prediction.riskLevel === 'low' && 
                          "Low injury risk. Player is in good condition to maintain current training regimen."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Top Risk Factors</h3>
                  <div className="space-y-3">
                    {prediction.topRiskFactors.map((factor, index) => (
                      <div key={index} className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{factor.factor}</span>
                          <span className="text-sm font-mono text-primary">
                            {(factor.impact * 100).toFixed(1)}% impact
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${factor.impact * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">AI Recommendations</h3>
                  <div className="space-y-2">
                    {prediction.recommendations.map((rec, index) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                      >
                        {prediction.riskLevel === 'high' ? (
                          <AlertTriangle className="w-5 h-5 text-risk-high flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-risk-low flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
