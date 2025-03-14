import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Clock, Database, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';

const StatsOverview = ({ stats, isLoading = false }) => {
  const statCards = [
    {
      title: 'Total Jobs',
      value: stats.totalJobs,
      icon: <Database className="h-5 w-5 text-blue-600" />,
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: 'Active Jobs',
      value: stats.activeJobs,
      icon: <PlayCircle className="h-5 w-5 text-green-600" />,
      color: 'bg-green-50 text-green-600 border-green-200'
    },
    {
      title: 'Completed Jobs',
      value: stats.completedJobs,
      icon: <CheckCircle className="h-5 w-5 text-purple-600" />,
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      title: 'Failed Jobs',
      value: stats.failedJobs,
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      color: 'bg-red-50 text-red-600 border-red-200'
    },
    {
      title: 'Avg. Completion',
      value: `${stats.avgCompletionTime} min`,
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      color: 'bg-orange-50 text-orange-600 border-orange-200'
    },
    {
      title: 'Total Items Scraped',
      value: stats.scrapedItems.toLocaleString(),
      icon: <Activity className="h-5 w-5 text-cyan-600" />,
      color: 'bg-cyan-50 text-cyan-600 border-cyan-200'
    }
  ];

  if (isLoading) {
    return (
      <>
        {[...Array(6)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {statCards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <div className={`p-1.5 rounded-full ${card.color.split(' ')[0]}`}>{card.icon}</div>
            </div>
            <div className="flex items-baseline">
              <h3 className="text-2xl font-bold">{card.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default StatsOverview;