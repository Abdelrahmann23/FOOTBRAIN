import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Shield, 
  Users, 
  Calendar,
  Activity,
  Settings,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const recentActivities = [
    { id: 1, action: 'Player added', target: 'John Doe', time: '2 hours ago', type: 'success' },
    { id: 2, action: 'Injury prediction', target: '3 players analyzed', time: '5 hours ago', type: 'info' },
    { id: 3, action: 'Market value updated', target: 'Team portfolio', time: '1 day ago', type: 'success' },
    { id: 4, action: 'Video analyzed', target: 'Match footage', time: '2 days ago', type: 'info' },
  ];

  return (
    <div className="min-h-screen">
      <Header 
        title="Profile" 
        subtitle={user?.role === 'admin' ? 'Your account details' : 'Your account and team details'} 
      />

      <div className="p-6 animate-fade-in">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Profile Header Card */}
          <Card className="ai-glow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="w-24 h-24 border-2 border-primary/20">
                  <AvatarImage src="" alt={user?.name || 'User'} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{user?.name || 'Unknown User'}</h2>
                    <Badge variant={user?.role === 'admin' ? 'destructive' : 'default'} className="capitalize">
                      {user?.role === 'admin' ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          User
                        </>
                      )}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{user?.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Member since {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs defaultValue="account" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
              <TabsTrigger value="account" className="gap-2">
                <User className="w-4 h-4" />
                Account
              </TabsTrigger>
              {user?.role !== 'admin' && (
                <TabsTrigger value="team" className="gap-2">
                  <Users className="w-4 h-4" />
                  Team
                </TabsTrigger>
              )}
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your personal account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Full Name</span>
                      </div>
                      <p className="text-lg font-semibold">{user?.name || 'Unknown'}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Email Address</span>
                      </div>
                      <p className="text-lg font-semibold">{user?.email || 'Unknown'}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Account Role</span>
                      </div>
                      <Badge variant={user?.role === 'admin' ? 'destructive' : 'default'} className="text-sm capitalize">
                        {user?.role || 'user'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Member Since</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {new Date().toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="justify-start">
                        Change Password
                      </Button>
                      <Button variant="outline" className="justify-start">
                        Update Email
                      </Button>
                      <Button variant="outline" className="justify-start">
                        Privacy Settings
                      </Button>
                      <Button variant="outline" className="justify-start">
                        Notification Preferences
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tab - Only for non-admin users */}
            {user?.role !== 'admin' && (
              <TabsContent value="team" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Information</CardTitle>
                    <CardDescription>Details about your football team</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Team Name</span>
                      </div>
                      <p className="text-2xl font-bold">{user?.teamInfo?.name || 'No team configured'}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Total Players
                        </p>
                        <p className="text-3xl font-bold">{user?.teamInfo?.totalPlayers ?? 0}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Injury Alerts
                        </p>
                        <p className="text-3xl font-bold text-destructive">
                          {user?.teamInfo?.injuryAlerts ?? 0}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-risk-low/10 border border-risk-low/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Market Value
                        </p>
                        <p className="text-3xl font-bold text-risk-low">
                          {user?.teamInfo?.marketValue ?? '€0M'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                          Videos Analyzed
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {user?.teamInfo?.videosAnalyzed ?? 0}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex gap-4">
                      <Button variant="default">
                        Manage Players
                      </Button>
                      <Button variant="outline">
                        Team Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={activity.id}>
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 p-2 rounded-full ${
                            activity.type === 'success' 
                              ? 'bg-risk-low/10 text-risk-low' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {activity.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-sm text-muted-foreground">{activity.target}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.time}
                            </p>
                          </div>
                        </div>
                        {index < recentActivities.length - 1 && (
                          <Separator className="my-4 ml-12" />
                        )}
                      </div>
                    ))}
                  </div>
                  {recentActivities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

