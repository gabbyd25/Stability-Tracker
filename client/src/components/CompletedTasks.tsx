import { TaskWithProduct } from "@shared/schema";
import { CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CompletedTasksProps {
  tasks: TaskWithProduct[];
  onTaskUpdate: () => void;
}

export default function CompletedTasks({ tasks, onTaskUpdate }: CompletedTasksProps) {
  const { toast } = useToast();
  const completedTasks = tasks.filter(task => task.completed);

  const undoCompleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, {
        completed: false,
      });
      return response.json();
    },
    onSuccess: (data, taskId) => {
      const task = completedTasks.find(t => t.id === taskId);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onTaskUpdate();
      toast({
        title: "Task marked incomplete",
        description: task ? `${task.name} moved back to active tasks` : "Task moved back to active tasks",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error updating task",
        description: error.message || "Failed to mark task as incomplete",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      return response.json();
    },
    onSuccess: (data, taskId) => {
      const task = completedTasks.find(t => t.id === taskId);
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onTaskUpdate();
      toast({
        title: "Task deleted",
        description: task ? `${task.name} moved to recycle bin` : "Task moved to recycle bin",
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

  if (completedTasks.length === 0) {
    return null;
  }

  return (
    <div className="mt-12" data-testid="completed-tasks-section">
      <div className="flex items-center mb-6">
        <CheckCircle className="w-6 h-6 mr-3 text-emerald-600" />
        <h2 className="text-2xl font-bold text-gray-800" data-testid="completed-tasks-title">
          Completed Tasks
        </h2>
        <span className="ml-2 text-sm text-gray-500">
          ({completedTasks.length} task{completedTasks.length !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="grid gap-4" data-testid="completed-tasks-list">
        {completedTasks.map((task) => (
          <div
            key={task.id}
            className="border border-gray-200 rounded-xl p-4 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-200"
            data-testid={`completed-task-${task.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-700 mb-2" data-testid={`completed-task-name-${task.id}`}>
                  {task.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  <span className="px-2 py-1 bg-emerald-200 rounded-full text-xs text-emerald-800">
                    {task.type.replace('ft-', 'F/T ').replace('-', ' ').toUpperCase()}
                  </span>
                  <span className="flex items-center text-emerald-600 font-medium">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Completed
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Product: {task.product.name}
                  {task.completedAt && (
                    <span className="ml-2">
                      • Completed: {new Date(task.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => undoCompleteMutation.mutate(task.id)}
                  disabled={undoCompleteMutation.isPending}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  data-testid={`button-undo-${task.id}`}
                  title="Mark task as incomplete"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                
                <Button
                  onClick={() => deleteTaskMutation.mutate(task.id)}
                  disabled={deleteTaskMutation.isPending}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  data-testid={`button-delete-${task.id}`}
                  title="Delete task (moves to recycle bin)"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}