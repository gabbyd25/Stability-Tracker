import { useQuery } from "@tanstack/react-query";
import ProductForm from "@/components/ProductForm";
import StatsGrid from "@/components/StatsGrid";
import TaskSection from "@/components/TaskSection";
import CompletedTasks from "@/components/CompletedTasks";
import RecycleBin from "@/components/RecycleBin";
import { TaskWithProduct } from "@shared/schema";
import { FlaskConical, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user } = useAuth();
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-white shadow-2xl">
            {/* User Section */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center text-white/80">
                <User className="w-5 h-5 mr-2" />
                <span className="text-sm">
                  {user?.email || 'Loading...'}
                </span>
              </div>
              <Button
                onClick={() => window.location.href = '/api/logout'}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
            
            {/* Title Section */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 p-3 rounded-full mr-4">
                  <FlaskConical className="w-8 h-8" />
                </div>
                <h1 className="text-4xl md:text-5xl font-light" data-testid="app-title">
                  Stability Testing Tracker
                </h1>
              </div>
              <p className="text-xl text-white/90 max-w-2xl mx-auto" data-testid="app-description">
                Automated Stability Testing Management System
              </p>
            </div>
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
