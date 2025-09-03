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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Calendar, Save } from "lucide-react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  testingIntervals: z.array(z.number()).min(1, "At least one testing interval is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateBuilderProps {
  onTemplateCreated: () => void;
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

export default function TemplateBuilder({ onTemplateCreated }: TemplateBuilderProps) {
  const [open, setOpen] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([0, 1, 2, 4, 8, 13]); // Default to standard
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      testingIntervals: [0, 1, 2, 4, 8, 13],
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await apiRequest('POST', '/api/schedule-templates', {
        ...data,
        testingIntervals: JSON.stringify(data.testingIntervals),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-templates'] });
      onTemplateCreated();
      setOpen(false);
      form.reset();
      setSelectedWeeks([0, 1, 2, 4, 8, 13]);
      
      toast({
        title: "Template created successfully!",
        description: "Your custom testing schedule is now available.",
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

  const handleWeekChange = (week: number, checked: boolean) => {
    const newWeeks = checked 
      ? [...selectedWeeks, week].sort((a, b) => a - b)
      : selectedWeeks.filter(w => w !== week);
    
    setSelectedWeeks(newWeeks);
    form.setValue('testingIntervals', newWeeks);
  };

  const onSubmit = (data: TemplateFormData) => {
    createTemplateMutation.mutate({
      ...data,
      testingIntervals: selectedWeeks,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          data-testid="button-create-template"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Create Custom Testing Schedule
          </DialogTitle>
          <DialogDescription>
            Design your own testing intervals for stability testing. Select the weeks when testing should occur.
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
                {selectedWeeks.length} interval{selectedWeeks.length !== 1 ? 's' : ''} selected
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
              <p className="text-red-500 text-sm">{form.formState.errors.testingIntervals.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
            <p className="text-sm text-blue-700">
              Testing will occur at: {selectedWeeks.length > 0 
                ? selectedWeeks.map(w => w === 0 ? 'Initial' : `Week ${w}`).join(', ')
                : 'No intervals selected'
              }
            </p>
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
              disabled={createTemplateMutation.isPending || selectedWeeks.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-template"
            >
              <Save className="w-4 h-4 mr-2" />
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}