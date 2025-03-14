import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Pause, 
  Plus, 
  Settings, 
  Clock, 
  Database, 
  Target, 
  List, 
  Activity,
  Search,
  Trash2,
  Edit,
  ExternalLink,
  Download,
  RefreshCw,
  Filter,
  BarChart,
  PieChart,
  Check,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import JobsTable from './JobsTable';
import StatsOverview from './StatsOverview';
import ProxyHealth from './ProxyHealth';
import ProjectList from './ProjectList';
import RecentRecordings from './RecentRecordings';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgCompletionTime: 0,
    scrapedItems: 0
  });
  
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('all');
  
  useEffect(() => {
    // Fetch initial data
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, these would be API calls
      // Simulated data for demonstration
      
      // Fetch projects
      const projectsData = [
        { id: '1', name: 'E-commerce Monitoring', description: 'Track product prices and availability', jobCount: 5, lastRun: '2023-06-15T10:30:00Z' },
        { id: '2', name: 'News Aggregator', description: 'Collect articles from news sites', jobCount: 3, lastRun: '2023-06-14T08:15:00Z' },
        { id: '3', name: 'Social Media Tracker', description: 'Monitor social media accounts', jobCount: 2, lastRun: '2023-06-13T14:45:00Z' }
      ];
      setProjects(projectsData);
      
      // Set active project if none selected
      if (!activeProject && projectsData.length > 0) {
        setActiveProject(projectsData[0]);
      }
      
      // Fetch jobs for active project
      const jobsData = [
        { id: '101', name: 'Amazon Products', status: 'running', progress: 65, target: 'amazon.com', startTime: '2023-06-15T10:30:00Z', itemCount: 1256, errors: 0 },
        { id: '102', name: 'eBay Listings', status: 'completed', progress: 100, target: 'ebay.com', startTime: '2023-06-14T09:15:00Z', endTime: '2023-06-14T11:30:00Z', itemCount: 842, errors: 3 },
        { id: '103', name: 'Walmart Prices', status: 'failed', progress: 37, target: 'walmart.com', startTime: '2023-06-13T14:20:00Z', endTime: '2023-06-13T14:35:00Z', itemCount: 122, errors: 15 },
        { id: '104', name: 'Target Inventory', status: 'queued', progress: 0, target: 'target.com', startTime: null, itemCount: 0, errors: 0 },
        { id: '105', name: 'Best Buy Products', status: 'completed', progress: 100, target: 'bestbuy.com', startTime: '2023-06-12T08:00:00Z', endTime: '2023-06-12T10:15:00Z', itemCount: 756, errors: 2 }
      ];
      setJobs(jobsData);
      
      // Calculate stats
      const activeJobCount = jobsData.filter(job => job.status === 'running').length;
      const completedJobCount = jobsData.filter(job => job.status === 'completed').length;
      const failedJobCount = jobsData.filter(job => job.status === 'failed').length;
      
      const completedJobs = jobsData.filter(job => job.status === 'completed');
      const totalCompletionTime = completedJobs.reduce((total, job) => {
        const start = new Date(job.startTime);
        const end = new Date(job.endTime);
        return total + (end - start);
      }, 0);
      
      const avgTime = completedJobs.length > 0 ? 
        Math.round(totalCompletionTime / completedJobs.length / 60000) : 0; // in minutes
      
      const totalItems = jobsData.reduce((sum, job) => sum + job.itemCount, 0);
      
      setStats({
        totalJobs: jobsData.length,
        activeJobs: activeJobCount,
        completedJobs: completedJobCount,
        failedJobs: failedJobCount,
        avgCompletionTime: avgTime,
        scrapedItems: totalItems
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateJob = () => {
    // This would open a modal or navigate to job creation page
    console.log('Create new job');
  };
  
  const handleProjectSelect = (project) => {
    setActiveProject(project);
    // In a real app, this would trigger fetching jobs for the selected project
  };
  
  const handleFilterChange = (value) => {
    setJobFilter(value);
  };
  
  const filteredJobs = () => {
    if (jobFilter === 'all') return jobs;
    return jobs.filter(job => job.status === jobFilter);
  };
  
  const refreshData = () => {
    fetchDashboardData();
  };
  
  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Loading Dashboard</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">DynamicScout AI</h1>
          <p className="text-muted-foreground">Intelligent Web Scraping Platform</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateJob} variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsOverview stats={stats} isLoading={isLoading} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Jobs Overview</CardTitle>
                <div className="flex items-center space-x-2">
                  <Select defaultValue={jobFilter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="queued">Queued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <JobsTable jobs={filteredJobs()} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectList 
                  projects={projects} 
                  activeProject={activeProject}
                  onSelectProject={handleProjectSelect}
                  isLoading={isLoading} 
                />
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Proxy Health</CardTitle>
              </CardHeader>
              <CardContent>
                <ProxyHealth isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentRecordings isLoading={isLoading} />
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              View All Recordings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;