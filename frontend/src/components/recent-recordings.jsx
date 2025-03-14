import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, MoreHorizontal, ExternalLink, Play, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const RecentRecordings = ({ isLoading = false }) => {
  // Mock data - in a real app this would come from an API
  const [recordings, setRecordings] = useState([
    {
      id: '1',
      name: 'Amazon Product Search',
      url: 'amazon.com/s?k=laptop',
      createdAt: '2023-06-15T14:30:00Z',
      duration: 145, // seconds
      actionCount: 37,
      analyzed: true,
      username: 'john.doe'
    },
    {
      id: '2',
      name: 'eBay Category Navigation',
      url: 'ebay.com/b/Electronics',
      createdAt: '2023-06-14T10:15:00Z',
      duration: 78, // seconds
      actionCount: 16,
      analyzed: true,
      username: 'jane.smith'
    },
    {
      id: '3',
      name: 'News Article Extraction',
      url: 'cnn.com/world',
      createdAt: '2023-06-13T16:45:00Z',
      duration: 210, // seconds
      actionCount: 42,
      analyzed: false,
      username: 'john.doe'
    },
    {
      id: '4',
      name: 'Social Media Interaction',
      url: 'twitter.com/explore',
      createdAt: '2023-06-12T09:20:00Z',
      duration: 185, // seconds
      actionCount: 29,
      analyzed: true,
      username: 'sam.johnson'
    }
  ]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Analyzed</TableHead>
              <TableHead>Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(4)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-9 w-9 rounded" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>Analyzed</TableHead>
            <TableHead className="text-right">Options</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recordings.map((recording) => (
            <TableRow key={recording.id}>
              <TableCell className="font-medium">{recording.name}</TableCell>
              <TableCell>
                <div className="flex items-center">
                  {recording.url}
                  <ExternalLink className="h-3 w-3 ml-2 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell>{formatDate(recording.createdAt)}</TableCell>
              <TableCell>{formatDuration(recording.duration)}</TableCell>
              <TableCell>{recording.actionCount}</TableCell>
              <TableCell>
                {recording.analyzed ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" /> Analyzed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <X className="h-3 w-3 mr-1" /> Pending
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button variant="ghost" size="icon" title="View Recording">
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="icon" title="Create Job from Recording">
                    <Play className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Recording Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Create Job</DropdownMenuItem>
                      <DropdownMenuItem>Export Recording</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">Delete Recording</DropdownMenuItem>
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

export default RecentRecordings;
    