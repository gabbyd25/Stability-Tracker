import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, type InsertTask, type ScheduleTemplate } from "@shared/schema";
import TemplateBuilder from "@/components/TemplateBuilder";
import FTCycleBuilder from "@/components/FTCycleBuilder";
// Calendar integration removed from bulk operations

const formSchema = insertProductSchema.extend({
  name: z.string().min(1, "Product name is required"),
  assignee: z.string().min(1, "Assignee name is required"),
  startDate: z.string().min(1, "Start date is required"),
  scheduleTemplateId: z.string().optional(),
  ftCycleType: z.string().default("consecutive"),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormProps {
  onProductCreated: () => void;
}

export default function ProductForm({ onProductCreated }: ProductFormProps) {
  const { toast } = useToast();
  const [customFTCycles, setCustomFTCycles] = useState<any[]>([]);

  // Fetch schedule templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery<ScheduleTemplate[]>({
    queryKey: ['/api/schedule-templates'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      assignee: "",
      startDate: new Date().toISOString().split('T')[0],
      scheduleTemplateId: "standard",
      ftCycleType: "consecutive",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/products', data);
      return response.json();
    },
    onSuccess: async (product) => {
      // Generate tasks for the product using selected template and F/T cycle type
      const formData = form.getValues();
      const selectedTemplate = templates.find(t => t.id === formData.scheduleTemplateId);
      const tasks = generateStabilityTasks(
        product.id, 
        product.name, 
        product.startDate, 
        product.assignee,
        selectedTemplate,
        formData.ftCycleType,
        customFTCycles
      );
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
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
            <Label htmlFor="assignee" className="text-sm font-medium text-gray-700">
              Assignee
            </Label>
            <Input
              id="assignee"
              type="text"
              placeholder="e.g., Lab Technician"
              {...form.register("assignee")}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              data-testid="input-assignee"
            />
            {form.formState.errors.assignee && (
              <p className="text-red-500 text-sm">{form.formState.errors.assignee.message}</p>
            )}
          </div>

        </div>

        {/* Schedule Configuration Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-100">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Testing Schedule Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Schedule Template Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Testing Schedule Template
                </Label>
                <TemplateBuilder onTemplateCreated={refetchTemplates} />
              </div>
              <Select
                value={form.watch("scheduleTemplateId") || "standard"}
                onValueChange={(value) => form.setValue("scheduleTemplateId", value === "standard" ? "" : value)}
              >
                <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                  <SelectValue placeholder="Choose testing schedule..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Standard (Initial, Week 1, 2, 4, 8, 13)
                    </div>
                  </SelectItem>
                  {templates.filter(t => !t.isPreset).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {template.name}
                        {template.description && (
                          <span className="text-gray-500 ml-2">- {template.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Select the standard schedule or create a custom template
              </p>
            </div>

            {/* F/T Cycle Type Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Freeze/Thaw Cycle Timing
                </Label>
                {form.watch("ftCycleType") === "custom" && (
                  <FTCycleBuilder 
                    onCustomCycleSet={setCustomFTCycles}
                    currentCycles={customFTCycles}
                  />
                )}
              </div>
              <Select
                value={form.watch("ftCycleType") || "consecutive"}
                onValueChange={(value) => form.setValue("ftCycleType", value)}
              >
                <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consecutive">
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Consecutive Days (Day 1→2→3...)
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Weekly Cycles (Week 1, 2, 3...)
                    </div>
                  </SelectItem>
                  <SelectItem value="biweekly">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Bi-weekly Cycles (Every 2 weeks)
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Custom Cycles (Configure your own)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Choose how freeze/thaw cycles are scheduled, or create custom timing
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={createProductMutation.isPending}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-8 py-4 rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center text-lg"
            data-testid="button-create-tasks"
          >
            <Plus className="w-6 h-6 mr-3" />
            {createProductMutation.isPending ? "Creating Product & Tasks..." : "Create Product & Generate Tasks"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function generateStabilityTasks(
  productId: string, 
  productName: string, 
  startDate: string, 
  assignee: string,
  selectedTemplate?: ScheduleTemplate,
  ftCycleType: string = "consecutive",
  customFTCycles?: any[]
): InsertTask[] {
  // The startDate comes in as YYYY-MM-DD format from the date input
  // We need to make sure it stays exactly as entered without timezone shifts
  const tasks: InsertTask[] = [];

  // Determine weekly schedule from template or use default
  let weeklySchedule: { name: string; days: number }[] = [
    { name: 'Initial', days: 0 },
    { name: 'Week 1', days: 7 },
    { name: 'Week 2', days: 14 },
    { name: 'Week 4', days: 28 },
    { name: 'Week 8', days: 56 },
    { name: 'Week 13', days: 91 }
  ];

  // If a template is selected, use its schedule
  if (selectedTemplate) {
    try {
      const intervals = JSON.parse(selectedTemplate.testingIntervals);
      weeklySchedule = intervals.map((week: number, index: number) => ({
        name: week === 0 ? 'Initial' : `Week ${week}`,
        days: week * 7
      }));
    } catch (error) {
      console.error("Error parsing template intervals:", error);
      // Fall back to default schedule
    }
  }

  weeklySchedule.forEach(week => {
    let dueDateString: string;
    
    if (week.days === 0) {
      // For Initial task (0 days), use the exact start date
      dueDateString = startDate;
    } else {
      // For other tasks, calculate the date properly
      const [year, month, day] = startDate.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day);
      baseDate.setDate(baseDate.getDate() + week.days);
      
      const resultYear = baseDate.getFullYear();
      const resultMonth = String(baseDate.getMonth() + 1).padStart(2, '0');
      const resultDay = String(baseDate.getDate()).padStart(2, '0');
      dueDateString = `${resultYear}-${resultMonth}-${resultDay}`;
    }
    
    tasks.push({
      productId,
      name: `Stability - ${productName} ${week.name}`,
      type: 'weekly',
      dueDate: dueDateString,
      cycle: week.name,
      completed: false,
    });
  });

  // Generate Freeze/Thaw cycles based on selected type
  generateFreezeThawTasks(tasks, productId, productName, startDate, ftCycleType, customFTCycles);

  return tasks;
}

function generateFreezeThawTasks(
  tasks: InsertTask[], 
  productId: string, 
  productName: string, 
  startDate: string, 
  ftCycleType: string,
  customFTCycles?: any[]
): void {
  const [year, month, day] = startDate.split('-').map(Number);

  switch (ftCycleType) {
    case "consecutive":
      // Original consecutive day pattern (Day 1→2→3→4→5→6)
      const consecutiveCycles = [
        { cycle: 1, thawDay: 1, testDay: 2 },
        { cycle: 2, thawDay: 3, testDay: 4 },
        { cycle: 3, thawDay: 5, testDay: 6 }
      ];

      consecutiveCycles.forEach(ft => {
        addFTTasks(tasks, productId, productName, startDate, ft.cycle, ft.thawDay, ft.testDay);
      });
      break;

    case "weekly":
      // One F/T cycle per week (Week 1, 2, 3)
      const weeklyCycles = [
        { cycle: 1, thawWeek: 1, testWeek: 1 }, // Week 1: Thaw Day 1, Test Day 3
        { cycle: 2, thawWeek: 2, testWeek: 2 }, // Week 2: Thaw Day 1, Test Day 3  
        { cycle: 3, thawWeek: 3, testWeek: 3 }  // Week 3: Thaw Day 1, Test Day 3
      ];

      weeklyCycles.forEach(ft => {
        const thawDay = (ft.thawWeek - 1) * 7 + 1; // First day of each week
        const testDay = (ft.testWeek - 1) * 7 + 3;  // Third day of each week
        addFTTasks(tasks, productId, productName, startDate, ft.cycle, thawDay, testDay);
      });
      break;

    case "biweekly":
      // One F/T cycle every two weeks
      const biweeklyCycles = [
        { cycle: 1, thawDay: 1, testDay: 3 },   // Week 1
        { cycle: 2, thawDay: 15, testDay: 17 }, // Week 3  
        { cycle: 3, thawDay: 29, testDay: 31 }  // Week 5
      ];

      biweeklyCycles.forEach(ft => {
        addFTTasks(tasks, productId, productName, startDate, ft.cycle, ft.thawDay, ft.testDay);
      });
      break;

    case "custom":
      // Use custom F/T cycles if defined
      if (customFTCycles && customFTCycles.length > 0) {
        customFTCycles.forEach(ft => {
          addFTTasks(tasks, productId, productName, startDate, ft.cycle, ft.thawDay, ft.testDay);
        });
      } else {
        // Fall back to consecutive if no custom cycles defined
        generateFreezeThawTasks(tasks, productId, productName, startDate, "consecutive");
      }
      break;

    default:
      // Fall back to consecutive if unknown type
      generateFreezeThawTasks(tasks, productId, productName, startDate, "consecutive");
  }
}

function addFTTasks(
  tasks: InsertTask[], 
  productId: string, 
  productName: string, 
  startDate: string, 
  cycle: number, 
  thawDay: number, 
  testDay: number
): void {
  const [year, month, day] = startDate.split('-').map(Number);

  // Thaw task
  const thawDate = new Date(year, month - 1, day);
  thawDate.setDate(thawDate.getDate() + thawDay);
  
  const thawYear = thawDate.getFullYear();
  const thawMonth = String(thawDate.getMonth() + 1).padStart(2, '0');
  const thawDayStr = String(thawDate.getDate()).padStart(2, '0');
  const thawDateString = `${thawYear}-${thawMonth}-${thawDayStr}`;
  
  tasks.push({
    productId,
    name: `F/T Thaw - ${productName} Cycle ${cycle}`,
    type: 'ft-thaw',
    dueDate: thawDateString,
    cycle: `Cycle ${cycle}`,
    completed: false,
  });

  // Test task
  const testDate = new Date(year, month - 1, day);
  testDate.setDate(testDate.getDate() + testDay);
  
  const testYear = testDate.getFullYear();
  const testMonth = String(testDate.getMonth() + 1).padStart(2, '0');
  const testDayStr = String(testDate.getDate()).padStart(2, '0');
  const testDateString = `${testYear}-${testMonth}-${testDayStr}`;
  
  tasks.push({
    productId,
    name: `F/T Test - ${productName} Cycle ${cycle}`,
    type: 'ft-test',
    dueDate: testDateString,
    cycle: `Cycle ${cycle}`,
    completed: false,
  });
}
