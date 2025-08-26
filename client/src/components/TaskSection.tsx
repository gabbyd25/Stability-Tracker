import { useState, useMemo } from "react";
import { TaskWithProduct } from "@shared/schema";
import TaskCard from "./TaskCard";
import { List, Download, CheckSquare, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadIcsFile } from "@/lib/calendarService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TaskSectionProps {
  tasks: TaskWithProduct[];
  onTaskUpdate: () => void;
}

type FilterType = 'all' | 'weekly' | 'freeze-thaw' | 'due-today' | 'overdue' | 'completed';

export default function TaskSection({ tasks, onTaskUpdate }: TaskSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    switch (activeFilter) {
      case 'weekly':
        return tasks.filter(task => task.type === 'weekly');
      case 'freeze-thaw':
        return tasks.filter(task => task.type.startsWith('ft'));
      case 'due-today':
        return tasks.filter(task => task.dueDate === today && !task.completed);
      case 'overdue':
        return tasks.filter(task => task.dueDate < today && !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks.filter(task => !task.completed);
    }
  }, [tasks, activeFilter]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Sort by due date, with overdue tasks first
      const today = new Date().toISOString().split('T')[0];
      const aOverdue = a.dueDate < today && !a.completed;
      const bOverdue = b.dueDate < today && !b.completed;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredTasks]);

  const activeTasksCount = tasks.filter(task => !task.completed).length;
  const completedTasksCount = tasks.filter(task => task.completed).length;

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === sortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(sortedTasks.map(task => task.id)));
    }
  };

  const handleBulkDownload = async () => {
    const selectedTaskList = sortedTasks.filter(task => selectedTasks.has(task.id));
    
    if (selectedTaskList.length === 0) {
      toast({
        variant: "destructive",
        title: "No tasks selected",
        description: "Please select tasks to download",
      });
      return;
    }

    setBulkDownloading(true);
    
    try {
      // Download each selected task's .ics file with a small delay to avoid browser blocking
      for (let i = 0; i < selectedTaskList.length; i++) {
        const task = selectedTaskList[i];
        setTimeout(() => {
          downloadIcsFile(task);
        }, i * 100); // 100ms delay between downloads
      }
      
      toast({
        title: "Calendar files downloading",
        description: `Downloading ${selectedTaskList.length} calendar files`,
      });
      
      // Clear selections after download
      setSelectedTasks(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Failed to download calendar files",
      });
    } finally {
      setBulkDownloading(false);
    }
  };

  const deleteAllTasksMutation = useMutation({
    mutationFn: async () => {
      const activeTasks = tasks.filter(task => !task.completed);
      
      if (activeTasks.length === 0) {
        throw new Error("No active tasks to delete");
      }

      // Delete all active tasks
      for (const task of activeTasks) {
        await apiRequest('DELETE', `/api/tasks/${task.id}`);
      }
      
      return activeTasks.length;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onTaskUpdate();
      toast({
        title: "All tasks deleted",
        description: `Successfully deleted ${deletedCount} active tasks`,
      });
      setSelectedTasks(new Set()); // Clear selections
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error deleting tasks",
        description: error.message || "Failed to delete all tasks",
      });
    },
  });
  
  const filters = [
    { id: 'all', label: `Active (${activeTasksCount})`, isActive: activeFilter === 'all' },
    { id: 'weekly', label: 'Weekly Tests', isActive: activeFilter === 'weekly' },
    { id: 'freeze-thaw', label: 'Freeze/Thaw', isActive: activeFilter === 'freeze-thaw' },
    { id: 'due-today', label: 'Due Today', isActive: activeFilter === 'due-today' },
    { id: 'overdue', label: 'Overdue', isActive: activeFilter === 'overdue' },
    { id: 'completed', label: `Completed (${completedTasksCount})`, isActive: activeFilter === 'completed' },
  ];

  return (
    <section className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 md:mb-0 flex items-center" data-testid="task-section-title">
            <List className="w-6 h-6 mr-3 text-primary-500" />
            Task Management
          </h2>
          <div className="text-sm text-gray-500" data-testid="task-summary">
            <span>{activeTasksCount} active</span> • <span>{completedTasksCount} completed</span> • Last updated <span>just now</span>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as FilterType)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filter.isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-primary-100 hover:text-primary-700'
                }`}
                data-testid={`filter-${filter.id}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          {/* Bulk Actions */}
          {sortedTasks.length > 0 && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  data-testid="button-select-all"
                >
                  {selectedTasks.size === sortedTasks.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedTasks.size === sortedTasks.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedTasks.size > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedTasks.size} task{selectedTasks.size === 1 ? '' : 's'} selected
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                {selectedTasks.size > 0 && (
                  <Button
                    onClick={handleBulkDownload}
                    disabled={bulkDownloading}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-bulk-download"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {bulkDownloading ? 'Downloading...' : `Download ${selectedTasks.size} .ics file${selectedTasks.size === 1 ? '' : 's'}`}
                  </Button>
                )}
                
                {activeTasksCount > 0 && (
                  <Button
                    onClick={() => deleteAllTasksMutation.mutate()}
                    disabled={deleteAllTasksMutation.isPending}
                    size="sm"
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    data-testid="button-delete-all"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {deleteAllTasksMutation.isPending ? 'Deleting...' : `Delete All Active (${activeTasksCount})`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Grid */}
      <div className="p-6">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <List className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No tasks found</h3>
            <p className="text-gray-600">Try adjusting your filters or add a new product to create tasks.</p>
          </div>
        ) : (
          <div className="grid gap-4" data-testid="task-grid">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTaskUpdate={onTaskUpdate}
                isSelected={selectedTasks.has(task.id)}
                onSelect={(selected) => handleTaskSelect(task.id, selected)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
