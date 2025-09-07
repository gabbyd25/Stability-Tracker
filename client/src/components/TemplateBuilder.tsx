import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Calendar, Save, X, Edit2 } from "lucide-react";
import { type ScheduleTemplate } from "@shared/schema";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  testingIntervals: z.any().refine(
    (val) => Array.isArray(val) && val.length > 0,
    "At least one testing interval is required"
  ),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateBuilderProps {
  onTemplateCreated: () => void;
  editTemplate?: ScheduleTemplate;
  mode?: 'create' | 'edit';
}

const WEEK_OPTIONS = [
  { value: 0, label: "Initial (Day 0)" },
  { value: 1, label: "Week 1" },
  { value: 2, label: "Week 2" },
  { value: 3, label: "Week 3" },
  { value: 4, label: "Week 4" },
  { value: 6, label: "Week 6" },
  { value: 8, label: "Week 8" },
  { value: 12, label: "Week 12" },
  { value: 13, label: "Week 13" },
  { value: 16, label: "Week 16" },
  { value: 20, label: "Week 20" },
  { value: 24, label: "Week 24" },
  { value: 26, label: "Week 26" },
  { value: 39, label: "Week 39" },
  { value: 52, label: "Week 52" },
];

interface CustomInterval {
  id: string;
  value: number;
  unit: 'days' | 'weeks' | 'months';
  days: number; // calculated value in days
}

export default function TemplateBuilder({ onTemplateCreated, editTemplate, mode = 'create' }: TemplateBuilderProps) {
  const [open, setOpen] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>(editTemplate ? [] : [0, 1, 2, 4, 8, 13]); // Default to standard
  const [customIntervals, setCustomIntervals] = useState<CustomInterval[]>([]);
  const [customValue, setCustomValue] = useState<string>("");
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months'>('weeks');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: editTemplate?.name || "",
      description: editTemplate?.description || "",
      testingIntervals: editTemplate ? [] : [0, 1, 2, 4, 8, 13],
    },
  });

  // Initialize edit mode data
  useState(() => {
    if (editTemplate) {
      try {
        const intervals = JSON.parse(editTemplate.testingIntervals);
        const presetWeeks: number[] = [];
        const customIntervalsData: CustomInterval[] = [];
        
        // Handle both old format (array of numbers) and new format (array of objects)
        if (Array.isArray(intervals) && intervals.length > 0) {
          if (typeof intervals[0] === 'number') {
            // Old format - array of day numbers
            intervals.forEach((days: number) => {
              const weeks = days / 7;
              const presetWeek = WEEK_OPTIONS.find(option => option.value === weeks);
              if (presetWeek) {
                presetWeeks.push(weeks);
              } else {
                // Reconstruct custom interval from days
                let value: number;
                let unit: 'days' | 'weeks' | 'months';
                
                if (days % 30 === 0 && days >= 30) {
                  value = days / 30;
                  unit = 'months';
                } else if (days % 7 === 0 && days >= 7) {
                  value = days / 7;
                  unit = 'weeks';
                } else {
                  value = days;
                  unit = 'days';
                }
                
                customIntervalsData.push({
                  id: `${Date.now()}-${Math.random()}`,
                  value,
                  unit,
                  days,
                });
              }
            });
          } else {
            // New format - array of interval objects
            intervals.forEach((interval: any) => {
              if (interval.type === 'preset') {
                presetWeeks.push(interval.value);
              } else {
                customIntervalsData.push({
                  id: `${Date.now()}-${Math.random()}`,
                  value: interval.value,
                  unit: interval.unit,
                  days: interval.days,
                });
              }
            });
          }
        }
        
        setSelectedWeeks(presetWeeks);
        setCustomIntervals(customIntervalsData);
        updateFormIntervals(presetWeeks, customIntervalsData);
      } catch (error) {
        console.error('Error parsing edit template intervals:', error);
      }
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const payload = {
        ...data,
        testingIntervals: JSON.stringify(data.testingIntervals),
      };
      
      const response = mode === 'edit' && editTemplate
        ? await apiRequest('PATCH', `/api/schedule-templates/${editTemplate.id}`, payload)
        : await apiRequest('POST', '/api/schedule-templates', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-templates'] });
      onTemplateCreated();
      setOpen(false);
      form.reset();
      setSelectedWeeks([0, 1, 2, 4, 8, 13]);
      setCustomIntervals([]);
      setCustomValue("");
      setCustomUnit('weeks');
      
      toast({
        title: mode === 'edit' ? "Template updated successfully!" : "Template created successfully!",
        description: mode === 'edit' ? "Your template changes have been saved." : "Your custom testing schedule is now available.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error creating template",
        description: error.message || "Failed to create template",
      });
    },
  });

  const convertToDays = (value: number, unit: 'days' | 'weeks' | 'months'): number => {
    switch (unit) {
      case 'days':
        return value;
      case 'weeks':
        return value * 7;
      case 'months':
        return value * 30; // Approximate month as 30 days
      default:
        return value;
    }
  };

  const getAllIntervals = () => {
    // Convert preset weeks to enhanced interval objects
    const presetIntervals = selectedWeeks.map(week => ({
      days: week * 7,
      originalUnit: 'weeks' as const,
      originalValue: week,
      isPreset: true
    }));
    
    // Convert custom intervals to enhanced interval objects  
    const customIntervalsEnhanced = customIntervals.map(interval => ({
      days: interval.days,
      originalUnit: interval.unit,
      originalValue: interval.value,
      isPreset: false
    }));
    
    // Combine and sort by days
    return [...presetIntervals, ...customIntervalsEnhanced].sort((a, b) => a.days - b.days);
  };

  const handleWeekChange = (week: number, checked: boolean) => {
    const newWeeks = checked 
      ? [...selectedWeeks, week].sort((a, b) => a - b)
      : selectedWeeks.filter(w => w !== week);
    
    setSelectedWeeks(newWeeks);
    updateFormIntervals(newWeeks, customIntervals);
  };

  const addCustomInterval = () => {
    const value = parseInt(customValue);
    if (!value || value <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid interval",
        description: "Please enter a valid positive number.",
      });
      return;
    }

    const days = convertToDays(value, customUnit);
    const newInterval: CustomInterval = {
      id: `${Date.now()}-${Math.random()}`,
      value,
      unit: customUnit,
      days,
    };

    const newCustomIntervals = [...customIntervals, newInterval];
    setCustomIntervals(newCustomIntervals);
    updateFormIntervals(selectedWeeks, newCustomIntervals);
    setCustomValue("");
  };

  const removeCustomInterval = (id: string) => {
    const newCustomIntervals = customIntervals.filter(interval => interval.id !== id);
    setCustomIntervals(newCustomIntervals);
    updateFormIntervals(selectedWeeks, newCustomIntervals);
  };

  const updateFormIntervals = (weeks: number[], customs: CustomInterval[]) => {
    const allIntervals = getAllIntervals();
    form.setValue('testingIntervals', allIntervals);
  };

  const onSubmit = (data: TemplateFormData) => {
    const allIntervals = getAllIntervals();
    saveTemplateMutation.mutate({
      ...data,
      testingIntervals: allIntervals,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          data-testid={mode === 'edit' ? "button-edit-template" : "button-create-template"}
        >
          {mode === 'edit' ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {mode === 'edit' ? 'Edit Template' : 'Create Template'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            {mode === 'edit' ? 'Edit Testing Schedule Template' : 'Create Custom Testing Schedule'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modify your testing intervals for stability testing. Update the weeks when testing should occur.'
              : 'Design your own testing intervals for stability testing. Select the weeks when testing should occur.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Extended Cosmetic Testing"
                {...form.register("name")}
                data-testid="input-template-name"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                placeholder="Describe when to use this testing schedule..."
                {...form.register("description")}
                data-testid="input-template-description"
              />
            </div>
          </div>

          {/* Week Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Testing Intervals</Label>
              <span className="text-sm text-gray-500">
                {selectedWeeks.length + customIntervals.length} interval{selectedWeeks.length + customIntervals.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
              {WEEK_OPTIONS.map((week) => (
                <div key={week.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`week-${week.value}`}
                    checked={selectedWeeks.includes(week.value)}
                    onCheckedChange={(checked) => handleWeekChange(week.value, !!checked)}
                    data-testid={`checkbox-week-${week.value}`}
                  />
                  <Label 
                    htmlFor={`week-${week.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {week.label}
                  </Label>
                </div>
              ))}
            </div>

            {form.formState.errors.testingIntervals && (
              <p className="text-red-500 text-sm">
                {typeof form.formState.errors.testingIntervals.message === 'string' 
                  ? form.formState.errors.testingIntervals.message 
                  : 'Please select at least one testing interval'}
              </p>
            )}

            {/* Custom Intervals Section */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <Label className="text-base font-medium">Custom Intervals</Label>
              <p className="text-sm text-gray-600">Add specific testing intervals not covered by the preset options above.</p>
              
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 5"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-20"
                  data-testid="input-custom-interval-value"
                />
                <Select value={customUnit} onValueChange={(value: 'days' | 'weeks' | 'months') => setCustomUnit(value)}>
                  <SelectTrigger className="w-24" data-testid="select-custom-interval-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomInterval}
                  disabled={!customValue || parseInt(customValue) <= 0}
                  data-testid="button-add-custom-interval"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* List of added custom intervals */}
              {customIntervals.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Added Custom Intervals:</Label>
                  <div className="space-y-1">
                    {customIntervals.map((interval) => (
                      <div key={interval.id} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                        <span className="text-sm text-blue-700">
                          {interval.value} {interval.unit} ({interval.days} days)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomInterval(interval.id)}
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                          data-testid={`button-remove-custom-interval-${interval.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
            <div className="text-sm text-blue-700">
              {(() => {
                const allIntervals = getAllIntervals();
                if (allIntervals.length === 0) {
                  return <p>No intervals selected</p>;
                }
                
                const formatInterval = (interval: any): string => {
                  if (interval.days === 0) return 'Initial';
                  // Use original unit for better naming
                  if (interval.originalUnit === 'months') {
                    return `Month ${interval.originalValue}`;
                  } else if (interval.originalUnit === 'weeks') {
                    return `Week ${interval.originalValue}`;
                  } else if (interval.originalUnit === 'days') {
                    return `Day ${interval.originalValue}`;
                  }
                  // Fallback to day-based naming
                  return `Day ${interval.days}`;
                };
                
                return (
                  <div>
                    <p className="mb-2"><strong>Testing will occur at:</strong></p>
                    <div className="flex flex-wrap gap-1">
                      {allIntervals.map((interval, index) => (
                        <span key={index} className="bg-blue-100 px-2 py-1 rounded text-xs">
                          {formatInterval(interval)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveTemplateMutation.isPending || (selectedWeeks.length === 0 && customIntervals.length === 0)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-template"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveTemplateMutation.isPending ? (mode === 'edit' ? "Updating..." : "Creating...") : (mode === 'edit' ? "Update Template" : "Create Template")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}