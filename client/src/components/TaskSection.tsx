import { useState, useMemo } from "react";
import { TaskWithProduct } from "@shared/schema";
import TaskCard from "./TaskCard";
import { List } from "lucide-react";

interface TaskSectionProps {
  tasks: TaskWithProduct[];
  onTaskUpdate: () => void;
}

type FilterType = 'all' | 'weekly' | 'freeze-thaw' | 'due-today' | 'overdue';

export default function TaskSection({ tasks, onTaskUpdate }: TaskSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
      default:
        return tasks;
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

  const filters = [
    { id: 'all', label: 'All Tasks', isActive: activeFilter === 'all' },
    { id: 'weekly', label: 'Weekly Tests', isActive: activeFilter === 'weekly' },
    { id: 'freeze-thaw', label: 'Freeze/Thaw', isActive: activeFilter === 'freeze-thaw' },
    { id: 'due-today', label: 'Due Today', isActive: activeFilter === 'due-today' },
    { id: 'overdue', label: 'Overdue', isActive: activeFilter === 'overdue' },
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
            <span>{tasks.length} tasks</span> • Last updated <span>just now</span>
          </div>
        </div>

        {/* Filters */}
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
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
