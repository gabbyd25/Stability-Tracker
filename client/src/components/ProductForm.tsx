import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, type InsertTask } from "@shared/schema";
// Calendar integration removed from bulk operations

const formSchema = insertProductSchema.extend({
  name: z.string().min(1, "Product name is required"),
  email: z.string().email("Valid email address is required"),
  startDate: z.string().min(1, "Start date is required"),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormProps {
  onProductCreated: () => void;
}

export default function ProductForm({ onProductCreated }: ProductFormProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/products', data);
      return response.json();
    },
    onSuccess: async (product) => {
      // Generate tasks for the product
      const tasks = generateStabilityTasks(product.id, product.name, product.startDate, product.email);
      
      // Create tasks in batch
      await apiRequest('POST', '/api/tasks/batch', { tasks });
      
      form.reset();
      onProductCreated();
      
      toast({
        title: "Product created successfully!",
        description: `Generated ${tasks.length} stability testing tasks for ${product.name}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error creating product",
        description: error.message || "Failed to create product and tasks",
      });
    },
  });

  const handleExportToOutlook = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/tasks');
      const tasks = await response.json();
      
      if (tasks.length === 0) {
        toast({
          variant: "destructive",
          title: "No tasks to export",
          description: "Please create some products and tasks first",
        });
        return;
      }

      // Calendar export removed - use individual task buttons
      
      toast({
        title: "Calendar exported!",
        description: `Exported ${tasks.length} tasks to Outlook calendar file`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to export calendar file",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const onSubmit = (data: FormData) => {
    createProductMutation.mutate(data);
  };

  return (
    <section className="bg-white rounded-2xl shadow-2xl p-8 mb-8 animate-fade-in border border-gray-100">
      <div className="flex items-center mb-6">
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-2 rounded-lg mr-3">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800" data-testid="form-title">
          Add New Product
        </h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Product Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., Compound XYZ-123"
              {...form.register("name")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              data-testid="input-product-name"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              {...form.register("startDate")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              data-testid="input-start-date"
            />
            {form.formState.errors.startDate && (
              <p className="text-red-500 text-sm">{form.formState.errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="researcher@lab.com"
              {...form.register("email")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              data-testid="input-email"
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Actions</Label>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
                data-testid="button-create-tasks"
              >
                <Plus className="w-5 h-5 mr-2" />
                {createProductMutation.isPending ? "Creating..." : "Create Tasks"}
              </Button>
              
              <Button
                type="button"
                onClick={handleExportToOutlook}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center"
                data-testid="button-export-outlook"
                title="Export all tasks to Outlook calendar file"
              >
                <Calendar className="w-5 h-5 mr-1" />
                {isExporting ? "Exporting..." : "Outlook"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function generateStabilityTasks(productId: string, productName: string, startDate: string, email: string): InsertTask[] {
  const start = new Date(startDate);
  const tasks: InsertTask[] = [];

  // Weekly tasks
  const weeklySchedule = [
    { name: 'Initial', days: 0 },
    { name: 'Week 1', days: 7 },
    { name: 'Week 2', days: 14 },
    { name: 'Week 4', days: 28 },
    { name: 'Week 8', days: 56 },
    { name: 'Week 13', days: 91 }
  ];

  weeklySchedule.forEach(week => {
    const dueDate = new Date(start);
    dueDate.setDate(start.getDate() + week.days);
    
    tasks.push({
      productId,
      name: `Stability - ${productName} ${week.name}`,
      type: 'weekly',
      dueDate: dueDate.toISOString().split('T')[0],
      cycle: week.name,
      completed: false,
    });
  });

  // Freeze/Thaw cycles
  const ftCycles = [
    { cycle: 1, thawDay: 1, testDay: 2 },
    { cycle: 2, thawDay: 3, testDay: 4 },
    { cycle: 3, thawDay: 5, testDay: 6 }
  ];

  ftCycles.forEach(ft => {
    // Thaw task
    const thawDate = new Date(start);
    thawDate.setDate(start.getDate() + ft.thawDay);
    
    tasks.push({
      productId,
      name: `F/T Thaw - ${productName} Cycle ${ft.cycle}`,
      type: 'ft-thaw',
      dueDate: thawDate.toISOString().split('T')[0],
      cycle: `Cycle ${ft.cycle}`,
      completed: false,
    });

    // Test task
    const testDate = new Date(start);
    testDate.setDate(start.getDate() + ft.testDay);
    
    tasks.push({
      productId,
      name: `F/T Test - ${productName} Cycle ${ft.cycle}`,
      type: 'ft-test',
      dueDate: testDate.toISOString().split('T')[0],
      cycle: `Cycle ${ft.cycle}`,
      completed: false,
    });
  });

  return tasks;
}
