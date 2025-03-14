import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ProxyHealth = ({ isLoading = false }) => {
  // In a real application, this would come from an API
  const [proxyStats, setProxyStats] = useState({
    total: 120,
    active: 98,
    blacklisted: 22,
    avgSuccessRate: 86.7,
    avgResponseTime: 325,
    countries: {
      'us': 24,
      'gb': 18,
      'de': 15,
      'fr': 12,
      'jp': 10,
      'ca': 9,
      'au': 8,
      'other': 24
    }
  });
  
  const data = [
    { name: 'Active', value: proxyStats.active },
    { name: 'Blacklisted', value: proxyStats.blacklisted }
  ];
  
  const COLORS = ['#4ade80', '#f87171'];
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
  
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  const getCountryFlag = (countryCode) => {
    // Convert country code to uppercase regional indicator symbols for emoji flag
    const base = 127397; // Unicode code point for regional indicator symbol letter A minus the code point for uppercase A
    return countryCode.toUpperCase().split('')
      .map(char => String.fromCodePoint(char.charCodeAt(0) + base))
      .join('');
  };
  
  const sortedCountries = Object.entries(proxyStats.countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 countries
  
  if (isLoading) {
    return (
      <div>
        <div className="mb-4">
          <Skeleton className="h-[150px] w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="mb-1">
            <Badge variant="outline" className="mr-2">
              {proxyStats.total} Total
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {proxyStats.active} Active
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Success Rate: {proxyStats.avgSuccessRate}% • Avg Response: {proxyStats.avgResponseTime}ms
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="h-[150px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => [`${value} proxies`, null]}
              labelFormatter={(index) => data[index].name}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center">
          <Globe className="h-4 w-4 mr-1" />
          Top Locations
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {sortedCountries.map(([country, count]) => (
            <div key={country} className="flex items-center justify-between bg-muted/50 rounded p-2">
              <div className="flex items-center">
                <span className="mr-2" aria-hidden="true">
                  {country !== 'other' ? getCountryFlag(country) : '🌐'}
                </span>
                <span className="text-xs uppercase">{country}</span>
              </div>
              <span className="text-xs font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProxyHealth;