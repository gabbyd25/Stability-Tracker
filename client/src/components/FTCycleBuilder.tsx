import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Zap, Plus, Minus, Save, Bookmark } from "lucide-react";
import { type FTCycleTemplate } from "@shared/schema";

const ftCycleSchema = z.object({
  cycles: z.array(z.object({
    cycle: z.number(),
    thawDay: z.number().min(1, "Thaw day must be at least 1"),
    testDay: z.number().min(1, "Test day must be at least 1"),
  })).min(1, "At least one cycle is required"),
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  cycles: z.array(z.object({
    cycle: z.number(),
    thawDay: z.number(),
    testDay: z.number(),
  })),
});

type FTCycleFormData = z.infer<typeof ftCycleSchema>;
type TemplateFormData = z.infer<typeof templateSchema>;

interface FTCycle {
  cycle: number;
  thawDay: number;
  testDay: number;
}

interface FTCycleBuilderProps {
  onCustomCycleSet: (cycles: FTCycle[]) => void;
  currentCycles?: FTCycle[];
}

interface SaveTemplateModalProps {
  cycles: FTCycle[];
  onSaved: () => void;
  onClose: () => void;
}

function SaveTemplateModal({ cycles, onSaved, onClose }: SaveTemplateModalProps) {
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
      onSaved();
      onClose();
      
      toast({
        title: "F/T cycle template saved!",
        description: "Your custom freeze/thaw pattern is now available for reuse.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error saving template",
        description: error.message || "Failed to save F/T cycle template",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">Template Name</Label>
        <Input
          id="template-name"
          placeholder="e.g., Weekly F/T Cycles"
          {...form.register("name")}
          data-testid="input-ft-template-name"
        />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description">Description (Optional)</Label>
        <Textarea
          id="template-description"
          placeholder="Describe when to use this F/T cycle pattern..."
          {...form.register("description")}
          data-testid="input-ft-template-description"
        />
      </div>

      <div className="bg-purple-50 p-3 rounded-lg">
        <h5 className="font-medium text-purple-900 mb-2">Cycles to Save:</h5>
        <div className="space-y-1 text-sm text-purple-700">
          {cycles.map((cycle) => (
            <div key={cycle.cycle}>
              <strong>Cycle {cycle.cycle}:</strong> Thaw on Day {cycle.thawDay}, Test on Day {cycle.testDay}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          data-testid="button-cancel-save-ft"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createTemplateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="button-save-ft-template"
        >
          <Save className="w-4 h-4 mr-2" />
          {createTemplateMutation.isPending ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </form>
  );
}

export default function FTCycleBuilder({ onCustomCycleSet, currentCycles }: FTCycleBuilderProps) {
  const [open, setOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [cycles, setCycles] = useState<FTCycle[]>(
    currentCycles || [
      { cycle: 1, thawDay: 1, testDay: 2 },
      { cycle: 2, thawDay: 3, testDay: 4 },
      { cycle: 3, thawDay: 5, testDay: 6 }
    ]
  );
  const { toast } = useToast();

  // Fetch F/T cycle templates
  const { data: templates = [] } = useQuery<FTCycleTemplate[]>({
    queryKey: ['/api/ft-cycle-templates'],
  });

  const form = useForm<FTCycleFormData>({
    resolver: zodResolver(ftCycleSchema),
    defaultValues: {
      cycles,
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

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      try {
        const templateCycles = JSON.parse(template.cycles);
        setCycles(templateCycles);
        form.setValue('cycles', templateCycles);
        setSelectedTemplate(templateId);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error loading template",
          description: "Failed to parse template data.",
        });
      }
    }
  };

  const onSubmit = (data: FTCycleFormData) => {
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

    onCustomCycleSet(data.cycles);
    setOpen(false);
    
    toast({
      title: "Custom F/T cycles configured!",
      description: `Created ${data.cycles.length} custom freeze/thaw cycles.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
          data-testid="button-customize-ft"
        >
          <Settings className="w-4 h-4 mr-2" />
          Customize F/T
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            Custom Freeze/Thaw Cycles
          </DialogTitle>
          <DialogDescription>
            Define your own freeze/thaw cycle timing. Specify which days to thaw and test for each cycle.
          </DialogDescription>
        </DialogHeader>

        {showSaveModal ? (
          <SaveTemplateModal 
            cycles={cycles}
            onSaved={() => setShowSaveModal(false)}
            onClose={() => setShowSaveModal(false)}
          />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Load Template Section */}
            {templates.length > 0 && (
              <div className="space-y-3 pb-4 border-b">
                <Label className="text-base font-medium">Load Saved Template</Label>
                <Select value={selectedTemplate} onValueChange={loadTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a saved F/T cycle template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center">
                          <Bookmark className="w-4 h-4 mr-2" />
                          {template.name}
                          {template.description && (
                            <span className="text-gray-500 ml-2">- {template.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cycle Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Freeze/Thaw Cycles</Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveModal(true)}
                    data-testid="button-save-as-template"
                  >
                    <Bookmark className="w-4 h-4 mr-1" />
                    Save as Template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCycle}
                    data-testid="button-add-cycle"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Cycle
                  </Button>
                </div>
              </div>

            <div className="space-y-3">

              {cycles.map((cycle, index) => (
                <div key={cycle.cycle} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-sm w-16">
                    Cycle {cycle.cycle}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`thaw-${index}`} className="text-sm whitespace-nowrap">
                      Thaw Day:
                    </Label>
                    <Input
                      id={`thaw-${index}`}
                      type="number"
                      min="1"
                      value={cycle.thawDay}
                      onChange={(e) => updateCycle(index, 'thawDay', parseInt(e.target.value) || 1)}
                      className="w-20"
                      data-testid={`input-thaw-day-${index}`}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`test-${index}`} className="text-sm whitespace-nowrap">
                      Test Day:
                    </Label>
                    <Input
                      id={`test-${index}`}
                      type="number"
                      min="1"
                      value={cycle.testDay}
                      onChange={(e) => updateCycle(index, 'testDay', parseInt(e.target.value) || 1)}
                      className="w-20"
                      data-testid={`input-test-day-${index}`}
                    />
                  </div>

                  {cycles.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCycle(index)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-remove-cycle-${index}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
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
              data-testid="button-cancel-ft"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-save-ft"
            >
              Apply Custom Cycles
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}