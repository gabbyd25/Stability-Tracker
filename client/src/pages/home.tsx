import { useQuery } from "@tanstack/react-query";
import ProductForm from "@/components/ProductForm";
import StatsGrid from "@/components/StatsGrid";
import TaskSection from "@/components/TaskSection";
import CompletedTasks from "@/components/CompletedTasks";
import RecycleBin from "@/components/RecycleBin";
import { TaskWithProduct } from "@shared/schema";
import { FlaskConical } from "lucide-react";

export default function Home() {
  const {
    data: tasks = [],
    isLoading,
    refetch: refetchTasks
  } = useQuery<TaskWithProduct[]>({
    queryKey: ['/api/tasks'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600 font-inter">
      <div className="min-h-screen p-4 md:p-6 lg:p-8">
        {/* Header */}
        <header className="max-w-7xl mx-auto mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center text-white shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full mr-4">
                <FlaskConical className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-light" data-testid="app-title">
                Stability Testing Tracker
              </h1>
            </div>
            <p className="text-xl text-white/90 max-w-2xl mx-auto" data-testid="app-description">
              Automated laboratory stability testing management with intelligent scheduling and email notifications
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto">
          <ProductForm onProductCreated={refetchTasks} />
          <StatsGrid tasks={tasks} />
          <TaskSection tasks={tasks} onTaskUpdate={refetchTasks} />
        </main>

        {/* Recycle Bin */}
        <RecycleBin onTaskUpdate={refetchTasks} />
      </div>
    </div>
  );
}
