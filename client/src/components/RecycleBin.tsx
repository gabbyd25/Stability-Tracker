import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TaskWithProduct } from "@shared/schema";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RecycleBinProps {
  onTaskUpdate: () => void;
}

export default function RecycleBin({ onTaskUpdate }: RecycleBinProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const {
    data: deletedTasks = [],
    isLoading,
    refetch
  } = useQuery<TaskWithProduct[]>({
    queryKey: ['/api/tasks/deleted'],
    enabled: isOpen,
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/restore`);
      return response.json();
    },
    onSuccess: (data, taskId) => {
      const task = deletedTasks.find(t => t.id === taskId);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/deleted'] });
      onTaskUpdate();
      toast({
        title: "Task restored!",
        description: task ? `${task.name} has been restored` : "Task has been restored",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error restoring task",
        description: error.message || "Failed to restore task",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}/permanent`);
      return response.json();
    },
    onSuccess: (data, taskId) => {
      const task = deletedTasks.find(t => t.id === taskId);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/deleted'] });
      toast({
        title: "Task permanently deleted",
        description: task ? `${task.name} has been permanently removed` : "Task has been permanently removed",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting task",
        description: error.message || "Failed to permanently delete task",
      });
    },
  });

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gray-600 hover:bg-gray-700 text-white rounded-full p-3 shadow-lg z-50"
        title="Open recycle bin"
        data-testid="button-open-recycle-bin"
      >
        <Trash2 className="w-6 h-6" />
        {deletedTasks.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">
            {deletedTasks.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b">
          <div className="flex items-center">
            <Trash2 className="w-6 h-6 mr-3 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800" data-testid="recycle-bin-title">
              Recycle Bin
            </h2>
            <span className="ml-2 text-sm text-gray-500">
              ({deletedTasks.length} item{deletedTasks.length !== 1 ? 's' : ''})
            </span>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            className="bg-transparent hover:bg-gray-200 text-gray-600 p-2 rounded-full"
            data-testid="button-close-recycle-bin"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading deleted tasks...</div>
            </div>
          ) : deletedTasks.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-recycle-bin">
              <Trash2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Recycle bin is empty</h3>
              <p className="text-gray-500">Deleted tasks will appear here</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="deleted-tasks-list">
              {deletedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  data-testid={`deleted-task-${task.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700 mb-2" data-testid={`deleted-task-name-${task.id}`}>
                        {task.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                          {task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Product: {task.product.name} • Deleted: {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => restoreTaskMutation.mutate(task.id)}
                        disabled={restoreTaskMutation.isPending}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                        data-testid={`button-restore-${task.id}`}
                        title="Restore task"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                      
                      <Button
                        onClick={() => permanentDeleteMutation.mutate(task.id)}
                        disabled={permanentDeleteMutation.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                        data-testid={`button-permanent-delete-${task.id}`}
                        title="Permanently delete task"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {deletedTasks.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t">
            <div className="flex items-center text-sm text-gray-600">
              <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
              Tasks in recycle bin can be restored or permanently deleted
            </div>
          </div>
        )}
      </div>
    </div>
  );
}