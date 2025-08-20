import { useMemo } from "react";
import { TaskWithProduct } from "@shared/schema";
import { ClipboardList, Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface StatsGridProps {
  tasks: TaskWithProduct[];
}

export default function StatsGrid({ tasks }: StatsGridProps) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const dueToday = tasks.filter(task => task.dueDate === today && !task.completed).length;
    const overdue = tasks.filter(task => task.dueDate < today && !task.completed).length;

    return { total, completed, dueToday, overdue };
  }, [tasks]);

  const statCards = [
    {
      icon: ClipboardList,
      value: stats.total,
      label: "Total Tasks",
      gradient: "from-primary-500 to-primary-600",
    },
    {
      icon: Clock,
      value: stats.dueToday,
      label: "Due Today",
      gradient: "from-secondary-500 to-secondary-600",
    },
    {
      icon: AlertTriangle,
      value: stats.overdue,
      label: "Overdue",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: CheckCircle,
      value: stats.completed,
      label: "Completed",
      gradient: "from-emerald-500 to-emerald-600",
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300`}
            data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-2 rounded-lg">
                <Icon className="w-6 h-6" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1" data-testid={`stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {stat.value}
            </div>
            <div className="text-white/80 text-sm" data-testid={`stat-label-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              {stat.label}
            </div>
          </div>
        );
      })}
    </section>
  );
}
