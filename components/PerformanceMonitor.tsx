'use client';

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { getConnectionPoolStatus } from '@/lib/slices/sessionSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Users, Zap, AlertCircle } from 'lucide-react';

interface PerformanceMetrics {
  active: number;
  available: number;
  total: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  avgLatency: number;
  recentOperations: number;
  discrepancy?: {
    detected: boolean;
    poolCount?: number;
    actualCount?: number;
  };
}

export function PerformanceMonitor() {
  const dispatch = useAppDispatch();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const result = await dispatch(getConnectionPoolStatus()).unwrap();
        setMetrics(result);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Unable to load performance metrics
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = (metrics.active / metrics.total) * 100;
  const qualityColor = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  }[metrics.connectionQuality];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </span>
            <Badge variant="outline" className="text-xs">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Pool Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Pool Usage</span>
              <span className="text-sm text-muted-foreground">
                {metrics.active}/{metrics.total} active
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{metrics.available} available</span>
              <span>{usagePercentage.toFixed(1)}% used</span>
            </div>
          </div>

          {/* Connection Quality */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Quality</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${qualityColor}`}></div>
              <Badge variant={metrics.connectionQuality === 'excellent' ? 'default' : 'secondary'}>
                {metrics.connectionQuality}
              </Badge>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Active Sessions</span>
              </div>
              <div className="text-2xl font-bold">{metrics.active}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Latency</span>
              </div>
              <div className="text-2xl font-bold">{metrics.avgLatency}ms</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Recent Ops</span>
              </div>
              <div className="text-2xl font-bold">{metrics.recentOperations}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted"></div>
                <span className="text-sm text-muted-foreground">Available</span>
              </div>
              <div className="text-2xl font-bold">{metrics.available}</div>
            </div>
          </div>

          {/* Discrepancy Warning */}
          {metrics.discrepancy?.detected && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="text-sm">
                <span className="font-medium text-yellow-800">Data Discrepancy Detected</span>
                <p className="text-yellow-700">
                  Pool count: {metrics.discrepancy.poolCount}, Actual: {metrics.discrepancy.actualCount}
                </p>
              </div>
            </div>
          )}

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={usagePercentage > 80 ? 'destructive' : usagePercentage > 60 ? 'secondary' : 'default'}>
              {usagePercentage > 80 ? 'High Load' : usagePercentage > 60 ? 'Moderate Load' : 'Healthy Load'}
            </Badge>
            
            <Badge variant={metrics.avgLatency > 500 ? 'destructive' : metrics.avgLatency > 200 ? 'secondary' : 'default'}>
              {metrics.avgLatency > 500 ? 'High Latency' : metrics.avgLatency > 200 ? 'Moderate Latency' : 'Low Latency'}
            </Badge>

            {metrics.discrepancy?.detected && (
              <Badge variant="destructive">Sync Issue</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
