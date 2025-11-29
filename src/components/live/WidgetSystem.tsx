import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Clock, 
  Users, 
  MessageCircle,
  TrendingUp,
  Award,
  Target,
  Zap,
  Eye,
  Heart,
  Star,
  Shield
} from 'lucide-react';

export interface Widget {
  id: string;
  type: 'scoreboard' | 'timer' | 'viewer_count' | 'chat_overlay' | 'goal_tracker' | 'leaderboard' | 'alert';
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  isVisible: boolean;
}

interface WidgetSystemProps {
  widgets: Widget[];
  streamStats?: {
    viewerCount: number;
    chatMessageCount: number;
  };
  onWidgetUpdate?: (widgetId: string, updates: Partial<Widget>) => void;
}

/**
 * WidgetSystem - Sistema de widgets e overlays para transmissões
 * 
 * Widgets disponíveis:
 * - Placar (Scoreboard)
 * - Timer/Cronômetro
 * - Contador de viewers
 * - Overlay de chat
 * - Rastreador de metas
 * - Leaderboard
 * - Alertas
 */
const WidgetSystem: React.FC<WidgetSystemProps> = ({
  widgets,
  streamStats,
  onWidgetUpdate
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {widgets.map(widget => (
        widget.isVisible && (
          <div
            key={widget.id}
            className="absolute pointer-events-auto"
            style={{
              left: `${widget.position.x}px`,
              top: `${widget.position.y}px`,
              width: `${widget.size.width}px`,
              height: `${widget.size.height}px`,
            }}
          >
            {widget.type === 'scoreboard' && (
              <ScoreboardWidget config={widget.config} />
            )}
            {widget.type === 'timer' && (
              <TimerWidget config={widget.config} />
            )}
            {widget.type === 'viewer_count' && (
              <ViewerCountWidget count={streamStats?.viewerCount || 0} config={widget.config} />
            )}
            {widget.type === 'goal_tracker' && (
              <GoalTrackerWidget config={widget.config} />
            )}
            {widget.type === 'leaderboard' && (
              <LeaderboardWidget config={widget.config} />
            )}
            {widget.type === 'alert' && (
              <AlertWidget config={widget.config} />
            )}
          </div>
        )
      ))}
    </div>
  );
};

// Scoreboard Widget
const ScoreboardWidget: React.FC<{ config: any }> = ({ config }) => {
  const { team1, team2, score1, score2, title } = config;

  return (
    <div className="bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-md rounded-lg p-4 shadow-2xl border border-white/20">
      {title && (
        <div className="text-center text-white text-sm font-semibold mb-2 opacity-80">
          {title}
        </div>
      )}
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1 text-center">
          <div className="text-white font-bold text-lg mb-1">{team1 || 'Time 1'}</div>
          <div className="text-4xl font-black text-white">{score1 || 0}</div>
        </div>
        
        <div className="text-white/50 text-2xl font-bold">VS</div>
        
        <div className="flex-1 text-center">
          <div className="text-white font-bold text-lg mb-1">{team2 || 'Time 2'}</div>
          <div className="text-4xl font-black text-white">{score2 || 0}</div>
        </div>
      </div>
    </div>
  );
};

// Timer Widget
const TimerWidget: React.FC<{ config: any }> = ({ config }) => {
  const [time, setTime] = useState(config.initialTime || 0);
  const [isRunning, setIsRunning] = useState(config.autoStart || false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTime(prev => config.countDown ? Math.max(0, prev - 1) : prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, config.countDown]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-lg px-6 py-3 shadow-2xl border border-white/20">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-blue-400" />
        <div className="text-white font-mono text-3xl font-bold">
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
};

// Viewer Count Widget
const ViewerCountWidget: React.FC<{ count: number; config: any }> = ({ count, config }) => {
  return (
    <div className="bg-gradient-to-r from-red-600/90 to-pink-600/90 backdrop-blur-md rounded-full px-5 py-2 shadow-2xl border border-white/20">
      <div className="flex items-center gap-2">
        <Eye className="w-5 h-5 text-white" />
        <span className="text-white font-bold text-lg">{count.toLocaleString('pt-BR')}</span>
        <span className="text-white/80 text-sm">assistindo</span>
      </div>
    </div>
  );
};

// Goal Tracker Widget
const GoalTrackerWidget: React.FC<{ config: any }> = ({ config }) => {
  const { current, goal, title, icon } = config;
  const percentage = Math.min(100, (current / goal) * 100);

  return (
    <div className="bg-gradient-to-br from-green-900/90 to-emerald-900/90 backdrop-blur-md rounded-lg p-4 shadow-2xl border border-white/20 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-green-400" />
        <span className="text-white font-semibold">{title || 'Meta'}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-white">
          <span className="text-2xl font-bold">{current.toLocaleString('pt-BR')}</span>
          <span className="text-lg opacity-70">/ {goal.toLocaleString('pt-BR')}</span>
        </div>
        
        <div className="h-3 bg-black/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="text-right text-white/80 text-sm font-semibold">
          {percentage.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

// Leaderboard Widget
const LeaderboardWidget: React.FC<{ config: any }> = ({ config }) => {
  const { title, entries } = config;

  return (
    <div className="bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-md rounded-lg p-4 shadow-2xl border border-white/20 min-w-[300px]">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <span className="text-white font-semibold text-lg">{title || 'Ranking'}</span>
      </div>
      
      <div className="space-y-2">
        {entries?.slice(0, 5).map((entry: any, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 bg-black/20 rounded-lg p-2"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              index === 0 ? 'bg-yellow-500 text-black' :
              index === 1 ? 'bg-gray-400 text-black' :
              index === 2 ? 'bg-orange-600 text-white' :
              'bg-gray-700 text-white'
            }`}>
              {index + 1}
            </div>
            
            <div className="flex-1">
              <div className="text-white font-semibold">{entry.name}</div>
              <div className="text-white/60 text-sm">{entry.score} pontos</div>
            </div>
            
            {index === 0 && <Star className="w-5 h-5 text-yellow-400" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// Alert Widget
const AlertWidget: React.FC<{ config: any }> = ({ config }) => {
  const [isVisible, setIsVisible] = useState(true);
  const { type, message, username, amount } = config;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const getAlertStyle = () => {
    switch (type) {
      case 'follow':
        return 'from-blue-600 to-blue-800';
      case 'subscribe':
        return 'from-purple-600 to-purple-800';
      case 'donation':
        return 'from-green-600 to-green-800';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  const getAlertIcon = () => {
    switch (type) {
      case 'follow':
        return <Heart className="w-8 h-8" />;
      case 'subscribe':
        return <Star className="w-8 h-8" />;
      case 'donation':
        return <Zap className="w-8 h-8" />;
      default:
        return <Award className="w-8 h-8" />;
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getAlertStyle()} backdrop-blur-md rounded-lg p-6 shadow-2xl border-2 border-white/30 animate-bounce-in`}>
      <div className="flex items-center gap-4">
        <div className="text-white">
          {getAlertIcon()}
        </div>
        <div>
          <div className="text-white font-bold text-xl">{username}</div>
          <div className="text-white/90">{message}</div>
          {amount && (
            <div className="text-yellow-300 font-bold text-lg mt-1">
              R$ {amount.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetSystem;

