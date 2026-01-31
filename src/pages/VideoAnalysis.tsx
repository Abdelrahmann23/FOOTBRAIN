import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { analyzeVideo, type VideoAnalysisResponse } from '@/services/mockAIService';
import { Upload, Play, Video, Activity, MapPin, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function VideoAnalysis() {
  const [analysis, setAnalysis] = useState<VideoAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const mockFiles = [
    { name: 'match_chelsea_vs_arsenal_2024.mp4', duration: '90:00', size: '2.4 GB' },
    { name: 'training_session_jan_15.mp4', duration: '45:00', size: '890 MB' },
    { name: 'highlights_champions_league.mp4', duration: '12:30', size: '320 MB' },
  ];

  const runAnalysis = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const result = await analyzeVideo({
        videoPath: `/videos/${selectedFile}`,
        analysisType: 'full'
      });
      
      clearInterval(interval);
      setProgress(100);
      
      setTimeout(() => {
        setAnalysis(result);
        setIsAnalyzing(false);
      }, 500);
    } catch (error) {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  const heatmapZones = ['Defense', 'Left Wing', 'Center', 'Right Wing', 'Attack'];

  return (
    <div className="min-h-screen">
      <Header 
        title="Video Analysis" 
        subtitle="Computer vision analysis using YOLOv8 + OpenPose"
      />
      
      <div className="p-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Selection */}
          <div className="space-y-4">
            <div className="stat-card">
              <h3 className="font-semibold mb-4">Select Video</h3>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mb-4 hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports MP4, MOV, AVI
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or select existing</span>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {mockFiles.map((file) => (
                  <div
                    key={file.name}
                    onClick={() => setSelectedFile(file.name)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedFile === file.name
                        ? "border-primary bg-primary/5 ai-border-glow"
                        : "border-border hover:border-primary/30 bg-card"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Video className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.duration} • {file.size}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={runAnalysis} 
              disabled={!selectedFile || isAnalyzing}
              className="w-full"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Analyze Video
            </Button>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedFile && !analysis && !isAnalyzing && (
              <div className="stat-card flex flex-col items-center justify-center py-16 text-center">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Upload or Select a Video</h3>
                <p className="text-muted-foreground max-w-md">
                  Our AI will analyze player movements, generate heatmaps, and provide tactical insights using YOLOv8 and OpenPose.
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="stat-card py-16">
                <div className="max-w-md mx-auto space-y-6">
                  <LoadingSpinner size="lg" text="Analyzing video..." />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing</span>
                      <span className="font-mono">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="text-center text-xs text-muted-foreground space-y-1">
                    <p>Running YOLOv8 for player detection...</p>
                    <p>Applying OpenPose for pose estimation...</p>
                    <p>Generating heatmaps and movement data...</p>
                  </div>
                </div>
              </div>
            )}

            {analysis && !isAnalyzing && (
              <>
                {/* Analysis Complete */}
                <div className="stat-card border-2 border-primary/30 ai-border-glow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Video className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Analysis Complete</h3>
                      <p className="text-sm text-muted-foreground">
                        Video ID: {analysis.videoId}
                      </p>
                      <p className="text-sm text-primary mt-1">
                        Formation Detected: {analysis.results?.teamFormation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Player Metrics */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Player Movement Metrics</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Player</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">Distance</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">Top Speed</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">Avg Speed</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">Sprints</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.results?.playerMetrics.map((metric, index) => (
                          <tr key={index} className="border-b border-border/50 hover:bg-secondary/50">
                            <td className="py-3 px-2 font-medium">Player #{index + 1}</td>
                            <td className="text-right py-3 px-2 font-mono">{metric.distanceCovered.toFixed(1)} km</td>
                            <td className="text-right py-3 px-2 font-mono">{metric.topSpeed.toFixed(1)} km/h</td>
                            <td className="text-right py-3 px-2 font-mono">{metric.avgSpeed.toFixed(1)} km/h</td>
                            <td className="text-right py-3 px-2 font-mono">{metric.sprintCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Heatmap Zones */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Position Heatmap</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {analysis.results?.playerMetrics.map((metric, playerIndex) => (
                      <div key={playerIndex} className="space-y-2">
                        <p className="text-sm font-medium">Player #{playerIndex + 1}</p>
                        <div className="flex gap-1">
                          {metric.heatmapZones.map((intensity, zoneIndex) => (
                            <div key={zoneIndex} className="flex-1">
                              <div 
                                className="h-8 rounded transition-all"
                                style={{
                                  backgroundColor: `hsl(190, 95%, ${20 + intensity}%)`,
                                }}
                              />
                              <p className="text-xs text-muted-foreground text-center mt-1">
                                {heatmapZones[zoneIndex]}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pass Network */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Pass Network</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {analysis.results?.passNetwork.map((pass, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pass.from}</span>
                          <ArrowRight className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{pass.to}</span>
                        </div>
                        <span className="font-mono text-sm text-primary">{pass.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Output Paths */}
                <div className="stat-card">
                  <h3 className="font-semibold mb-4">Generated Outputs</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Annotated Video</span>
                      <code className="text-xs font-mono text-primary">{analysis.results?.annotatedVideoPath}</code>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm">Heatmap Image</span>
                      <code className="text-xs font-mono text-primary">{analysis.results?.heatmapPath}</code>
                    </div>
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
