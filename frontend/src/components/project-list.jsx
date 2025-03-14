import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, ChevronRight, MoreVertical, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ProjectList = ({ projects = [], activeProject, onSelectProject, isLoading = false }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    
    // If date is today, show time
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If date is yesterday, show "Yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-md">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded" />
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  
  if (projects.length === 0) {
    return (
      <div className="text-center p-6 bg-muted rounded-md">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-lg font-medium mb-1">No projects</h3>
        <p className="text-muted-foreground text-sm mb-4">Create your first project to get started</p>
        <Button size="sm" className="w-full">Create Project</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {projects.map((project) => {
        const isActive = activeProject && activeProject.id === project.id;
        
        return (
          <div 
            key={project.id}
            className={`flex items-center justify-between p-3 rounded-md transition-colors cursor-pointer ${
              isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            }`}
            onClick={() => onSelectProject(project)}
          >
            <div className="flex items-center space-x-4">
              <div className={`p-1.5 rounded-md bg-primary/10 ${isActive ? 'bg-primary/20' : ''}`}>
                <Folder className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">{project.name}</h4>
                <p className="text-xs text-muted-foreground">{project.jobCount} jobs • Last run: {formatDate(project.lastRun)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              {isActive && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Project Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Edit Project</DropdownMenuItem>
                  <DropdownMenuItem>Create Job</DropdownMenuItem>
                  <DropdownMenuItem>View Jobs</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">Delete Project</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectList;