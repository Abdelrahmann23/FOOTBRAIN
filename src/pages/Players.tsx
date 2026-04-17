import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { PlayerCard } from '@/components/ui/player-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlayerData } from '@/services/mockAIService';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { User, MapPin, Flag, Activity, Ruler, Weight, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Players() {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    shirtNumber: '',
    name: '',
    age: '',
    position: '',
    team: '',
    nationality: '',
    matches: '',
    goals: '',
    assists: '',
    tackles: '',
    interceptions: '',
    minutesPlayed: '',
    injuries: '',
    height: '',
    weight: '',
    sprintSpeed: '',
    stamina: '',
    strength: '',
  });

  // Load players for the current user's team from the backend
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!user) {
        setPlayers([]);
        return;
      }

      try {
        const response = await apiService.getMyPlayers();
        if (response.error || !response.data) {
          console.error('Error fetching players:', response.error);
          setPlayers([]);
          return;
        }
        setPlayers(response.data.players as PlayerData[]);
      } catch (error) {
        console.error('Error fetching players:', error);
        setPlayers([]);
      }
    };

    fetchPlayers();
  }, [user]);

  // Auto-fill team name when dialog opens, reset form when it closes
  useEffect(() => {
    if (isDialogOpen && user?.teamInfo?.name) {
      const defaultTeam = user.teamInfo.name;
      setFormData(prev => ({
        ...prev,
        team: prev.team || defaultTeam,
      }));
    } else if (!isDialogOpen) {
      setFormData({
        shirtNumber: '',
        name: '',
        age: '',
        position: '',
        team: '',
        nationality: '',
        matches: '',
        goals: '',
        assists: '',
        tackles: '',
        interceptions: '',
        minutesPlayed: '',
        injuries: '',
        height: '',
        weight: '',
        sprintSpeed: '',
        stamina: '',
        strength: '',
      });
    }
  }, [isDialogOpen, user]);

  const handleSavePlayer = async () => {
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add players',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.age || !formData.position || !formData.team || !formData.nationality || !formData.shirtNumber) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (T-shirt no, Name, Age, Position, Team, Nationality)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        age: parseInt(formData.age) || 0,
        position: formData.position,
        nationality: formData.nationality,
        globalId: parseInt(formData.shirtNumber) || 0,
        shirtNumber: parseInt(formData.shirtNumber) || 0,
        stats: {
          matches: parseInt(formData.matches) || 0,
          goals: parseInt(formData.goals) || 0,
          assists: parseInt(formData.assists) || 0,
          tackles: parseInt(formData.tackles) || 0,
          interceptions: parseInt(formData.interceptions) || 0,
          minutesPlayed: parseInt(formData.minutesPlayed) || 0,
          injuries: parseInt(formData.injuries) || 0,
        },
        physical: {
          height: parseInt(formData.height) || 0,
          weight: parseInt(formData.weight) || 0,
          sprintSpeed: parseInt(formData.sprintSpeed) || 0,
          stamina: parseInt(formData.stamina) || 0,
          strength: parseInt(formData.strength) || 0,
        },
      };

      const response = editingPlayerId
        ? await apiService.updatePlayer(editingPlayerId, payload)
        : await apiService.createPlayer(payload);

      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to create player');
      }

      const newPlayer = response.data.player as PlayerData;

      toast({
        title: editingPlayerId ? 'Player updated' : 'Player added',
        description: `${newPlayer.name} has been successfully ${editingPlayerId ? 'updated' : 'added'} to your team.`,
      });

      // Reset form
      setFormData({
        shirtNumber: '',
        name: '',
        age: '',
        position: '',
        team: '',
        nationality: '',
        matches: '',
        goals: '',
        assists: '',
        tackles: '',
        interceptions: '',
        minutesPlayed: '',
        injuries: '',
        height: '',
        weight: '',
        sprintSpeed: '',
        stamina: '',
        strength: '',
      });

      setEditingPlayerId(null);
      setIsDialogOpen(false);
      setPlayers(prev => {
        const idx = prev.findIndex(p => p.id === newPlayer.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = newPlayer;
          return copy;
        }
        return [...prev, newPlayer];
      });
      setSelectedPlayer(newPlayer);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add player',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = () => {
    if (!selectedPlayer) return;
    setEditingPlayerId(selectedPlayer.id);
    setFormData({
      shirtNumber: String(selectedPlayer.shirtNumber ?? selectedPlayer.globalId ?? ''),
      name: selectedPlayer.name || '',
      age: String(selectedPlayer.age || ''),
      position: selectedPlayer.position || '',
      team: selectedPlayer.team || '',
      nationality: selectedPlayer.nationality || '',
      matches: String(selectedPlayer.stats.matches || 0),
      goals: String(selectedPlayer.stats.goals || 0),
      assists: String(selectedPlayer.stats.assists || 0),
      tackles: String(selectedPlayer.stats.tackles || 0),
      interceptions: String(selectedPlayer.stats.interceptions || 0),
      minutesPlayed: String(selectedPlayer.stats.minutesPlayed || 0),
      injuries: String(selectedPlayer.stats.injuries || 0),
      height: String(selectedPlayer.physical.height || 0),
      weight: String(selectedPlayer.physical.weight || 0),
      sprintSpeed: String(selectedPlayer.physical.sprintSpeed || 0),
      stamina: String(selectedPlayer.physical.stamina || 0),
      strength: String(selectedPlayer.physical.strength || 0),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (!selectedPlayer) return;
    if (!window.confirm(`Delete ${selectedPlayer.name}? This cannot be undone.`)) return;
    const response = await apiService.deletePlayer(selectedPlayer.id);
    if (response.error) {
      toast({ title: 'Error', description: response.error, variant: 'destructive' });
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== selectedPlayer.id));
    setSelectedPlayer(null);
    toast({ title: 'Player deleted', description: `${selectedPlayer.name} was deleted.` });
  };

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const position = String(p.position || '').toLowerCase();
      const team = String(p.team || '').toLowerCase();
      const shirt = String(p.shirtNumber ?? p.globalId ?? '');
      const nationality = String(p.nationality || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      return (
        name.includes(q) ||
        position.includes(q) ||
        team.includes(q) ||
        nationality.includes(q) ||
        shirt.includes(q) ||
        id.includes(q)
      );
    });
  }, [players, searchQuery]);

  return (
    <div className="min-h-screen">
      <Header 
        title="Players" 
        subtitle="Player database and profiles"
      />
      
      <div className="p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Team Players</h2>
            <p className="text-muted-foreground">Manage your team's player database</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openEditDialog} disabled={!selectedPlayer} variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button onClick={handleDeleteSelected} disabled={!selectedPlayer} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={() => {
                setEditingPlayerId(null);
                setIsDialogOpen(true);
              }}
              className="group"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Use the search bar in the header to filter players by name, team, position, or shirt number.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player List */}
          <div className="lg:col-span-2">
            {filteredPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPlayers.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isSelected={selectedPlayer?.id === player.id}
                    onClick={() => setSelectedPlayer(player)}
                  />
                ))}
              </div>
            ) : (
              <div className="stat-card text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">{players.length === 0 ? 'No players yet' : 'No players match your search'}</h3>
                <p className="text-muted-foreground mb-4">
                  {players.length === 0 ? 'Get started by adding your first player' : 'Try a different name, position, or shirt number.'}
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>
              </div>
            )}
          </div>

          {/* Player Details */}
          <div className="space-y-4">
            {selectedPlayer ? (
              <>
                {/* Profile Card */}
                <div className="stat-card border-primary/30 ai-border-glow">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-xl">{selectedPlayer.name}</h2>
                      <p className="text-primary font-medium">{selectedPlayer.position}</p>
                      <p className="text-xs text-muted-foreground">T-shirt #{selectedPlayer.shirtNumber ?? selectedPlayer.globalId ?? '-'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedPlayer.team}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Flag className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Nationality</span>
                      </div>
                      <p className="font-medium">{selectedPlayer.nationality}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Age</span>
                      </div>
                      <p className="font-medium">{selectedPlayer.age} years</p>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Performance Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Matches</span>
                      <span className="font-mono font-medium">{selectedPlayer.stats.matches}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Goals</span>
                      <span className="font-mono font-medium text-primary">{selectedPlayer.stats.goals}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Assists</span>
                      <span className="font-mono font-medium">{selectedPlayer.stats.assists}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Minutes Played</span>
                      <span className="font-mono font-medium">{selectedPlayer.stats.minutesPlayed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Tackles</span>
                      <span className="font-mono font-medium">{selectedPlayer.stats.tackles ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Interceptions</span>
                      <span className="font-mono font-medium">{selectedPlayer.stats.interceptions ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Injuries</span>
                      <span className={cn(
                        "font-mono font-medium",
                        selectedPlayer.stats.injuries > 2 && "text-risk-high",
                        selectedPlayer.stats.injuries > 0 && selectedPlayer.stats.injuries <= 2 && "text-risk-medium",
                        selectedPlayer.stats.injuries === 0 && "text-risk-low"
                      )}>
                        {selectedPlayer.stats.injuries}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Physical Attributes */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Physical Attributes</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Ruler className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Height</span>
                        </div>
                        <p className="font-medium">{selectedPlayer.physical.height} cm</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Weight className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Weight</span>
                        </div>
                        <p className="font-medium">{selectedPlayer.physical.weight} kg</p>
                      </div>
                    </div>

                    {/* Attribute Bars */}
                    {[
                      { label: 'Sprint Speed', value: selectedPlayer.physical.sprintSpeed },
                      { label: 'Stamina', value: selectedPlayer.physical.stamina },
                      { label: 'Strength', value: selectedPlayer.physical.strength },
                    ].map((attr) => (
                      <div key={attr.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-muted-foreground">{attr.label}</span>
                          <span className="text-sm font-mono">{attr.value}</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${attr.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="stat-card flex flex-col items-center justify-center py-16 text-center">
                <User className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Select a Player</h3>
                <p className="text-muted-foreground">
                  Click on a player card to view their detailed profile.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Player Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingPlayerId(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPlayerId ? 'Edit Player' : 'Add New Player'}</DialogTitle>
              <DialogDescription>
                Enter player information to add them to your team database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shirtNumber">T-shirt Number (Global ID) *</Label>
                  <Input
                    id="shirtNumber"
                    type="number"
                    placeholder="15"
                    value={formData.shirtNumber}
                    onChange={(e) => setFormData({ ...formData, shirtNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Marcus Sterling"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="26"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData({ ...formData, position: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                      <SelectItem value="Defender">Defender</SelectItem>
                      <SelectItem value="Midfielder">Midfielder</SelectItem>
                      <SelectItem value="Forward">Forward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="team">Team *</Label>
                  <Input
                    id="team"
                    placeholder="Manchester United"
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Input
                  id="nationality"
                  placeholder="England"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  required
                />
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <h4 className="font-semibold mb-4">Performance Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="matches">Matches</Label>
                    <Input
                      id="matches"
                      type="number"
                      placeholder="34"
                      value={formData.matches}
                      onChange={(e) => setFormData({ ...formData, matches: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="goals">Goals</Label>
                    <Input
                      id="goals"
                      type="number"
                      placeholder="22"
                      value={formData.goals}
                      onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assists">Assists</Label>
                    <Input
                      id="assists"
                      type="number"
                      placeholder="8"
                      value={formData.assists}
                      onChange={(e) => setFormData({ ...formData, assists: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minutesPlayed">Minutes Played</Label>
                    <Input
                      id="minutesPlayed"
                      type="number"
                      placeholder="2890"
                      value={formData.minutesPlayed}
                      onChange={(e) => setFormData({ ...formData, minutesPlayed: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tackles">Tackles</Label>
                    <Input
                      id="tackles"
                      type="number"
                      placeholder="68"
                      value={formData.tackles}
                      onChange={(e) => setFormData({ ...formData, tackles: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="interceptions">Interceptions</Label>
                    <Input
                      id="interceptions"
                      type="number"
                      placeholder="54"
                      value={formData.interceptions}
                      onChange={(e) => setFormData({ ...formData, interceptions: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="injuries">Injuries</Label>
                    <Input
                      id="injuries"
                      type="number"
                      placeholder="1"
                      value={formData.injuries}
                      onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <h4 className="font-semibold mb-4">Physical Attributes</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="182"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="78"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sprintSpeed">Sprint Speed (0-100)</Label>
                    <Input
                      id="sprintSpeed"
                      type="number"
                      placeholder="94"
                      min="0"
                      max="100"
                      value={formData.sprintSpeed}
                      onChange={(e) => setFormData({ ...formData, sprintSpeed: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stamina">Stamina (0-100)</Label>
                    <Input
                      id="stamina"
                      type="number"
                      placeholder="88"
                      min="0"
                      max="100"
                      value={formData.stamina}
                      onChange={(e) => setFormData({ ...formData, stamina: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="strength">Strength (0-100)</Label>
                    <Input
                      id="strength"
                      type="number"
                      placeholder="76"
                      min="0"
                      max="100"
                      value={formData.strength}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePlayer}>
                {editingPlayerId ? 'Save Changes' : 'Add Player'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
