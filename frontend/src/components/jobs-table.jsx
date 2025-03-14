import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  ExternalLink, 
  Info, 
  Download, 
  MoreHorizontal,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

const JobsTable = ({ jobs = [], isLoading = false }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'queued':
        return <Badge className="bg-yellow-500">Queued</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };
  
  const getActionButton = (job) => {
    switch (job.status) {
      case 'running':
        return (
          <Button variant="outline" size="sm">
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        );
      case 'queued':
        return (
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
        );
      case 'completed':
        return (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        );
      case 'failed':
        return (
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Retry
          </Button>
        );
      default:
        return (
          <Button variant="outline" size="sm" disabled>
            <Info className="h-4 w-4 mr-1" />
            Details
          </Button>
        );
    }
  };
  
  if (isLoading) {
    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-9 w-24" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (jobs.length === 0) {
    return (
      <div className="text-center p-8 bg-muted rounded-md">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No jobs found</h3>
        <p className="text-muted-foreground mb-4">Create a new job to get started with data scraping.</p>
        <Button>Create New Job</Button>
      </div>
    );
  }
  
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{job.name}</TableCell>
              <TableCell>{getStatusBadge(job.status)}</TableCell>
              <TableCell className="flex items-center">
                {job.target}
                <ExternalLink className="h-3 w-3 ml-2 text-muted-foreground" />
              </TableCell>
              <TableCell>
                <div className="w-full max-w-xs">
                  <Progress value={job.progress} className="h-2" />
                  <span className="text-xs text-muted-foreground">{job.progress}%</span>
                </div>
              </TableCell>
              <TableCell>{job.itemCount.toLocaleString()}</TableCell>
              <TableCell>{formatDate(job.startTime)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {getActionButton(job)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Clone Job</DropdownMenuItem>
                      <DropdownMenuItem>Export Data</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">Delete Job</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default JobsTable;