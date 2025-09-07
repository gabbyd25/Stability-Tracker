import { useState, useEffect } from "react";
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
import { insertProductSchema, type InsertTask, type ScheduleTemplate, type FTCycleTemplate } from "@shared/schema";
import TemplateBuilder from "@/components/TemplateBuilder";
import FTCycleBuilder from "@/components/FTCycleBuilder";
import FTTemplateBuilder from "@/components/FTTemplateBuilder";
import TemplateManager from "@/components/TemplateManager";
// Calendar integration removed from bulk operations

const formSchema = insertProductSchema.extend({
  name: z.string().min(1, "Product name is required"),
  assignee: z.string().min(1, "Assignee name is required"),
  startDate: z.string().min(1, "Start date is required"),
  scheduleTemplateId: z.string().optional(),
  ftTemplateId: z.string().optional(),
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

  // Fetch F/T cycle templates
  const { data: ftTemplates = [], refetch: refetchFTTemplates } = useQuery<FTCycleTemplate[]>({
    queryKey: ['/api/ft-cycle-templates'],
  });

  // Get the standard template (preset template)
  const standardTemplate = templates.find(t => t.isPreset);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      assignee: "",
      startDate: new Date().toLocaleDateString('en-CA'), // Uses local timezone, returns YYYY-MM-DD
      scheduleTemplateId: "",
      ftTemplateId: "",
      ftCycleType: "consecutive",
    },
  });

  // Update form default when standard template is loaded
  useEffect(() => {
    if (standardTemplate && !form.getValues("scheduleTemplateId")) {
      form.setValue("scheduleTemplateId", standardTemplate.id);
    }
  }, [standardTemplate, form]);

  const createProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/products', data);
      return response.json();
    },
    onSuccess: async (product) => {
      // Generate tasks for the product using selected templates
      const formData = form.getValues();
      const selectedTemplate = templates.find(t => t.id === formData.scheduleTemplateId);
      const selectedFTTemplate = ftTemplates.find(t => t.id === formData.ftTemplateId);
      // Use ftCycleType if no custom template is selected, otherwise use "custom"
      const effectiveFtCycleType = formData.ftTemplateId ? "custom" : (formData.ftCycleType || "consecutive");
      const tasks = generateStabilityTasks(
        product.id, 
        product.name, 
        product.startDate, 
        product.assignee,
        selectedTemplate,
        effectiveFtCycleType,
        selectedFTTemplate,
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Testing Schedule Configuration</h3>
            </div>
            <TemplateManager onTemplateUpdated={() => { refetchTemplates(); refetchFTTemplates(); }} />
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
                value={form.watch("scheduleTemplateId") || standardTemplate?.id || ""}
                onValueChange={(value) => form.setValue("scheduleTemplateId", value)}
              >
                <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                  <SelectValue placeholder="Choose testing schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {standardTemplate && (
                    <SelectItem value={standardTemplate.id}>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {standardTemplate.name} (Initial, Week 1, 2, 4, 8, 13)
                      </div>
                    </SelectItem>
                  )}
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

            {/* F/T Cycle Template Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Freeze/Thaw Cycle Template
                </Label>
                <FTTemplateBuilder onTemplateCreated={refetchFTTemplates} />
              </div>
              <Select
                value={form.watch("ftTemplateId") || form.watch("ftCycleType") || "consecutive"}
                onValueChange={(value) => {
                  if (value === "consecutive" || value === "weekly" || value === "biweekly") {
                    // For preset cycle types, clear template ID and set cycle type
                    form.setValue("ftTemplateId", "");
                    form.setValue("ftCycleType", value);
                  } else {
                    // For custom templates, set template ID and clear cycle type
                    form.setValue("ftTemplateId", value);
                    form.setValue("ftCycleType", "");
                  }
                }}
              >
                <SelectTrigger className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200">
                  <SelectValue placeholder="Choose F/T cycle pattern..." />
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
                  {ftTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
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
                Select a standard pattern or use a custom F/T template
              </p>
              {form.watch("ftTemplateId") && ftTemplates.find(t => t.id === form.watch("ftTemplateId")) && (
                <FTCycleBuilder 
                  onCustomCycleSet={setCustomFTCycles}
                  currentCycles={customFTCycles}
                />
              )}
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
  selectedFTTemplate?: FTCycleTemplate,
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
      let intervals;
      if (typeof selectedTemplate.testingIntervals === 'string') {
        intervals = JSON.parse(selectedTemplate.testingIntervals);
      } else {
        intervals = selectedTemplate.testingIntervals;
      }
      weeklySchedule = intervals.map((interval: any) => {
        // Handle both old format (numbers) and new format (objects with metadata)
        let days: number;
        let name: string;
        
        if (typeof interval === 'number') {
          // Old format - just day numbers
          days = interval;
          if (days === 0) {
            name = 'Initial';
          } else if (days < 7) {
            name = `Day ${days}`;
          } else if (days % 7 === 0) {
            name = `Week ${days / 7}`;
          } else {
            name = `Day ${days}`;
          }
        } else {
          // New format - objects with original unit metadata
          days = interval.days;
          if (days === 0) {
            name = 'Initial';
          } else {
            // Use original unit for naming
            switch (interval.originalUnit) {
              case 'days':
                name = `Day ${interval.originalValue}`;
                break;
              case 'weeks':
                name = interval.originalValue === 1 ? 'Week 1' : `Week ${interval.originalValue}`;
                break;
              case 'months':
                name = interval.originalValue === 1 ? 'Month 1' : `Month ${interval.originalValue}`;
                break;
              default:
                // Fallback to day-based naming
                name = days < 7 ? `Day ${days}` : `Week ${Math.round(days / 7)}`;
            }
          }
        }
        
        return { name, days };
      });
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

  // Generate Freeze/Thaw cycles based on selected template or type
  generateFreezeThawTasks(tasks, productId, productName, startDate, ftCycleType, selectedFTTemplate, customFTCycles);

  return tasks;
}

function generateFreezeThawTasks(
  tasks: InsertTask[], 
  productId: string, 
  productName: string, 
  startDate: string, 
  ftCycleType: string,
  selectedFTTemplate?: FTCycleTemplate,
  customFTCycles?: any[]
): void {
  const [year, month, day] = startDate.split('-').map(Number);

  // If an F/T template is selected, use its cycles
  if (selectedFTTemplate) {
    try {
      const templateCycles = JSON.parse(selectedFTTemplate.cycles);
      templateCycles.forEach((ft: any) => {
        addFTTasks(tasks, productId, productName, startDate, ft.cycle, ft.thawDay, ft.testDay);
      });
      return;
    } catch (error) {
      console.error("Error parsing F/T template cycles:", error);
      // Fall back to consecutive if template parsing fails
    }
  }

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
      // One F/T cycle per week (Week 1, 2, 3) - Test day is 1 day after thaw day
      const weeklyCycles = [
        { cycle: 1, thawWeek: 1, testWeek: 1 }, // Week 1: Thaw Day 1, Test Day 2
        { cycle: 2, thawWeek: 2, testWeek: 2 }, // Week 2: Thaw Day 1, Test Day 2  
        { cycle: 3, thawWeek: 3, testWeek: 3 }  // Week 3: Thaw Day 1, Test Day 2
      ];

      weeklyCycles.forEach(ft => {
        const thawDay = (ft.thawWeek - 1) * 7 + 1; // First day of each week
        const testDay = (ft.testWeek - 1) * 7 + 2;  // Second day of each week (thaw + 1)
        addFTTasks(tasks, productId, productName, startDate, ft.cycle, thawDay, testDay);
      });
      break;

    case "biweekly":
      // One F/T cycle every two weeks - Test day is 1 day after thaw day
      const biweeklyCycles = [
        { cycle: 1, thawDay: 1, testDay: 2 },   // Week 1: Day 1 → Day 2
        { cycle: 2, thawDay: 15, testDay: 16 }, // Week 3: Day 15 → Day 16  
        { cycle: 3, thawDay: 29, testDay: 30 }  // Week 5: Day 29 → Day 30
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
        generateFreezeThawTasks(tasks, productId, productName, startDate, "consecutive", undefined, customFTCycles);
      }
      break;

    default:
      // Fall back to consecutive if unknown type
      generateFreezeThawTasks(tasks, productId, productName, startDate, "consecutive", undefined, customFTCycles);
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
