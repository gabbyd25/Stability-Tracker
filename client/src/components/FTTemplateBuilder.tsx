import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Zap, Save, Minus } from "lucide-react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  cycles: z.array(z.object({
    cycle: z.number(),
    thawDay: z.number().min(1, "Thaw day must be at least 1"),
    testDay: z.number().min(1, "Test day must be at least 1"),
  })).min(1, "At least one cycle is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface FTCycle {
  cycle: number;
  thawDay: number;
  testDay: number;
}

interface FTTemplateBuilderProps {
  onTemplateCreated: () => void;
}

export default function FTTemplateBuilder({ onTemplateCreated }: FTTemplateBuilderProps) {
  const [open, setOpen] = useState(false);
  const [cycles, setCycles] = useState<FTCycle[]>([
    { cycle: 1, thawDay: 1, testDay: 2 },
    { cycle: 2, thawDay: 3, testDay: 4 },
    { cycle: 3, thawDay: 5, testDay: 6 }
  ]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      cycles,
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await apiRequest('POST', '/api/ft-cycle-templates', {
        ...data,
        cycles: JSON.stringify(data.cycles),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ft-cycle-templates'] });
      onTemplateCreated();
      setOpen(false);
      form.reset();
      setCycles([
        { cycle: 1, thawDay: 1, testDay: 2 },
        { cycle: 2, thawDay: 3, testDay: 4 },
        { cycle: 3, thawDay: 5, testDay: 6 }
      ]);
      
      toast({
        title: "F/T template created successfully!",
        description: "Your custom freeze/thaw pattern is now available.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error creating template",
        description: error.message || "Failed to create F/T template",
      });
    },
  });

  const addCycle = () => {
    const newCycle = cycles.length + 1;
    const lastCycle = cycles[cycles.length - 1];
    const newCycles = [...cycles, {
      cycle: newCycle,
      thawDay: lastCycle ? lastCycle.testDay + 1 : 1,
      testDay: lastCycle ? lastCycle.testDay + 2 : 2,
    }];
    setCycles(newCycles);
    form.setValue('cycles', newCycles);
  };

  const removeCycle = (index: number) => {
    if (cycles.length <= 1) return;
    const newCycles = cycles.filter((_, i) => i !== index)
      .map((cycle, i) => ({ ...cycle, cycle: i + 1 }));
    setCycles(newCycles);
    form.setValue('cycles', newCycles);
  };

  const updateCycle = (index: number, field: keyof FTCycle, value: number) => {
    const newCycles = cycles.map((cycle, i) => 
      i === index ? { ...cycle, [field]: value } : cycle
    );
    setCycles(newCycles);
    form.setValue('cycles', newCycles);
  };

  const onSubmit = (data: TemplateFormData) => {
    // Validate that test day is after thaw day for each cycle
    const invalidCycles = data.cycles.filter(cycle => cycle.testDay <= cycle.thawDay);
    if (invalidCycles.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid cycle configuration",
        description: "Test day must be after thaw day for each cycle.",
      });
      return;
    }

    createTemplateMutation.mutate({
      ...data,
      cycles,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
          data-testid="button-create-ft-template"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            Create F/T Cycle Template
          </DialogTitle>
          <DialogDescription>
            Design your own freeze/thaw cycle pattern. Define when to thaw and test for each cycle.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ft-template-name">Template Name</Label>
              <Input
                id="ft-template-name"
                placeholder="e.g., Weekly F/T Cycles"
                {...form.register("name")}
                data-testid="input-ft-template-name"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ft-template-description">Description (Optional)</Label>
              <Textarea
                id="ft-template-description"
                placeholder="Describe when to use this F/T cycle pattern..."
                {...form.register("description")}
                data-testid="input-ft-template-description"
              />
            </div>
          </div>

          {/* Cycle Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Freeze/Thaw Cycles</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCycle}
                data-testid="button-add-ft-cycle"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Cycle
              </Button>
            </div>
            
            <div className="space-y-3">
              {cycles.map((cycle, index) => (
                <div key={cycle.cycle} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-sm w-16">
                    Cycle {cycle.cycle}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`ft-thaw-${index}`} className="text-sm whitespace-nowrap">
                      Thaw Day:
                    </Label>
                    <Input
                      id={`ft-thaw-${index}`}
                      type="number"
                      min="1"
                      value={cycle.thawDay}
                      onChange={(e) => updateCycle(index, 'thawDay', parseInt(e.target.value) || 1)}
                      className="w-20"
                      data-testid={`input-ft-thaw-day-${index}`}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`ft-test-${index}`} className="text-sm whitespace-nowrap">
                      Test Day:
                    </Label>
                    <Input
                      id={`ft-test-${index}`}
                      type="number"
                      min="1"
                      value={cycle.testDay}
                      onChange={(e) => updateCycle(index, 'testDay', parseInt(e.target.value) || 1)}
                      className="w-20"
                      data-testid={`input-ft-test-day-${index}`}
                    />
                  </div>

                  {cycles.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCycle(index)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-remove-ft-cycle-${index}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {form.formState.errors.cycles && (
              <p className="text-red-500 text-sm">{form.formState.errors.cycles.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Preview</h4>
            <div className="space-y-1 text-sm text-purple-700">
              {cycles.map((cycle) => (
                <div key={cycle.cycle}>
                  <strong>Cycle {cycle.cycle}:</strong> Thaw on Day {cycle.thawDay}, Test on Day {cycle.testDay}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-ft-template"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTemplateMutation.isPending || cycles.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-save-ft-template"
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