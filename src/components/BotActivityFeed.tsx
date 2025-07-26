import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface BotActivity {
  id: string;
  bot_id: string;
  activity_type: string;
  title: string;
  description: string;
  status: 'info' | 'success' | 'warning' | 'error';
  data: any;
  created_at: string;
  trading_bots?: {
    name: string;
    symbol: string;
  };
}

interface BotActivityFeedProps {
  botId?: string;
  maxItems?: number;
}

const BotActivityFeed = ({ botId, maxItems = 50 }: BotActivityFeedProps) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<BotActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchActivities();
    setupRealtimeSubscription();
  }, [user, botId]);

  const fetchActivities = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('bot_activities')
        .select(`
          *,
          trading_bots (
            name,
            symbol
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (botId) {
        query = query.eq('bot_id', botId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('bot_activities_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bot_activities',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newActivity = payload.new as BotActivity;
          if (!botId || newActivity.bot_id === botId) {
            setActivities(prev => [newActivity, ...prev.slice(0, maxItems - 1)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (activityType: string, status: string) => {
    switch (activityType) {
      case 'trade_signal':
        return <TrendingUp className="h-4 w-4" />;
      case 'order_placed':
        return <TrendingDown className="h-4 w-4" />;
      case 'order_filled':
        return <CheckCircle className="h-4 w-4" />;
      case 'order_cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'analysis':
        return <BarChart3 className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'status_change':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Aktivitetslogg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Laddar aktiviteter...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Aktivitetslogg
          {botId && <span className="text-sm font-normal text-muted-foreground">- Bot aktiviteter</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Inga aktiviteter att visa
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-lg border ${getStatusColor(activity.status)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getActivityIcon(activity.activity_type, activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={getStatusBadgeVariant(activity.status)} className="text-xs">
                            {activity.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(activity.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>
                      {activity.trading_bots && !botId && (
                        <div className="text-xs text-muted-foreground">
                          Bot: {activity.trading_bots.name} ({activity.trading_bots.symbol})
                        </div>
                      )}
                      {activity.data && Object.keys(activity.data).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Visa detaljer
                          </summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded text-muted-foreground overflow-x-auto">
                            {JSON.stringify(activity.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default BotActivityFeed;