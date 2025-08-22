import { useMutation } from "@tanstack/react-query";
import { TaskWithProduct } from "@shared/schema";
import { CheckCircle, Calendar, AlertTriangle, Trash2, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateOutlookLink, generateGoogleCalendarLink, downloadIcsFile } from "@/lib/calendarService";

interface TaskCardProps {
  task: TaskWithProduct;
  onTaskUpdate: () => void;
}

export default function TaskCard({ task, onTaskUpdate }: TaskCardProps) {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.dueDate < today && !task.completed;
  const isDueToday = task.dueDate === today && !task.completed;

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, {
        completed: !task.completed,
      });
      return response.json();
    },
    onSuccess: () => {
      onTaskUpdate();
      toast({
        title: task.completed ? "Task marked incomplete" : "Task completed!",
        description: `${task.name} has been ${task.completed ? 'uncompleted' : 'completed'}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating task",
        description: error.message || "Failed to update task status",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/tasks/${task.id}`);
      return response.json();
    },
    onSuccess: () => {
      onTaskUpdate();
      toast({
        title: "Task deleted",
        description: `${task.name} moved to recycle bin`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting task",
        description: error.message || "Failed to delete task",
      });
    },
  });

  const handleOutlookCalendar = () => {
    const link = generateOutlookLink(task);
    window.open(link, '_blank');
    toast({
      title: "Opening Outlook Calendar",
      description: `Creating calendar event for ${task.name}`,
    });
  };

  const handleGoogleCalendar = () => {
    const link = generateGoogleCalendarLink(task);
    window.open(link, '_blank');
    toast({
      title: "Opening Google Calendar",
      description: `Creating calendar event for ${task.name}`,
    });
  };

  const handleDownloadIcs = () => {
    try {
      downloadIcsFile(task);
      toast({
        title: "Calendar file downloaded",
        description: `${task.name}.ics file has been downloaded`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error downloading file",
        description: "Failed to download calendar file",
      });
    }
  };

  const getBorderColor = () => {
    if (task.type === 'weekly') return 'border-primary-500';
    if (task.type === 'ft-thaw') return 'border-secondary-500';
    if (task.type === 'ft-test') return 'border-purple-500';
    return 'border-gray-300';
  };

  const getBackgroundGradient = () => {
    if (isOverdue) return 'from-red-50 to-white';
    if (task.type === 'weekly') return 'from-primary-50 to-white';
    if (task.type === 'ft-thaw') return 'from-pink-50 to-white';
    if (task.type === 'ft-test') return 'from-purple-50 to-white';
    return 'from-gray-50 to-white';
  };

  const getTypeLabel = () => {
    switch (task.type) {
      case 'weekly':
        return 'Weekly Stability';
      case 'ft-thaw':
        return 'F/T Thaw';
      case 'ft-test':
        return 'F/T Test';
      default:
        return task.type;
    }
  };

  const getTypeBadgeColor = () => {
    if (task.type === 'weekly') return 'bg-primary-100 text-primary-700';
    if (task.type === 'ft-thaw') return 'bg-secondary-100 text-secondary-700';
    if (task.type === 'ft-test') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div
      className={`border-l-4 ${getBorderColor()} bg-gradient-to-r ${getBackgroundGradient()} rounded-r-xl p-6 hover:shadow-lg transition-all duration-300 animate-slide-up ${
        task.completed ? 'opacity-75' : ''
      }`}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3
            className={`font-semibold text-gray-800 text-lg mb-2 ${
              task.completed ? 'line-through' : ''
            }`}
            data-testid={`task-name-${task.id}`}
          >
            {task.name}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className={`flex items-center ${isOverdue ? 'text-red-600' : ''}`}>
              {isOverdue ? (
                <AlertTriangle className="w-4 h-4 mr-1" />
              ) : (
                <Calendar className="w-4 h-4 mr-1" />
              )}
              {isOverdue ? 'Overdue: ' : 'Due: '}
              <span data-testid={`task-due-date-${task.id}`}>
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </span>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor()}`}>
              {getTypeLabel()}
            </span>
          </div>
          
          <div className="text-sm text-gray-500" data-testid={`task-assignee-${task.id}`}>
            {task.completed ? 'Completed by' : 'Assigned to'}: {task.product.assignee}
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          {!task.completed ? (
            <>
              <Button
                onClick={() => completeTaskMutation.mutate()}
                disabled={completeTaskMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                data-testid={`button-complete-${task.id}`}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
              
              {/* Calendar Options */}
              <div className="relative group">
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  data-testid={`button-calendar-${task.id}`}
                  title="Calendar options"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Calendar
                </Button>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-48">
                  <div className="py-1">
                    <button
                      onClick={handleOutlookCalendar}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                      data-testid={`button-outlook-${task.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Outlook Calendar
                    </button>
                    <button
                      onClick={handleGoogleCalendar}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 flex items-center"
                      data-testid={`button-google-${task.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Google Calendar
                    </button>
                    <button
                      onClick={handleDownloadIcs}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      data-testid={`button-ics-${task.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download .ics file
                    </button>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => deleteTaskMutation.mutate()}
                disabled={deleteTaskMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                data-testid={`button-delete-${task.id}`}
                title="Delete task (moves to recycle bin)"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="flex items-center text-emerald-600 font-semibold">
                <CheckCircle className="w-4 h-4 mr-1" />
                Completed
              </div>
              <Button
                onClick={() => completeTaskMutation.mutate()}
                disabled={completeTaskMutation.isPending}
                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                data-testid={`button-undo-${task.id}`}
                title="Mark task as incomplete"
              >
                Undo
              </Button>
              <Button
                onClick={() => deleteTaskMutation.mutate()}
                disabled={deleteTaskMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                data-testid={`button-delete-${task.id}`}
                title="Delete task (moves to recycle bin)"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
