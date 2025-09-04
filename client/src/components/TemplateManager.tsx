import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Edit2, Trash2, Calendar, Zap, Plus } from "lucide-react";
import { type ScheduleTemplate, type FTCycleTemplate } from "@shared/schema";
import TemplateBuilder from "@/components/TemplateBuilder";
import FTTemplateBuilder from "@/components/FTTemplateBuilder";

interface TemplateManagerProps {
  onTemplateUpdated?: () => void;
}

export default function TemplateManager({ onTemplateUpdated }: TemplateManagerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'ft'>('schedule');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch schedule templates
  const { data: scheduleTemplates = [], refetch: refetchScheduleTemplates } = useQuery<ScheduleTemplate[]>({
    queryKey: ['/api/schedule-templates'],
  });

  // Fetch F/T cycle templates
  const { data: ftTemplates = [], refetch: refetchFTTemplates } = useQuery<FTCycleTemplate[]>({
    queryKey: ['/api/ft-cycle-templates'],
  });

  const deleteScheduleTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/schedule-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-templates'] });
      onTemplateUpdated?.();
      toast({
        title: "Template deleted",
        description: "Schedule template has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting template",
        description: error.message || "Failed to delete schedule template",
      });
    },
  });

  const deleteFTTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/ft-cycle-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ft-cycle-templates'] });
      onTemplateUpdated?.();
      toast({
        title: "Template deleted",
        description: "F/T cycle template has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting template",
        description: error.message || "Failed to delete F/T cycle template",
      });
    },
  });

  const handleDeleteScheduleTemplate = (template: ScheduleTemplate) => {
    if (template.isPreset) {
      toast({
        variant: "destructive",
        title: "Cannot delete preset template",
        description: "Preset templates cannot be deleted.",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`)) {
      deleteScheduleTemplateMutation.mutate(template.id);
    }
  };

  const handleDeleteFTTemplate = (template: FTCycleTemplate) => {
    if (confirm(`Are you sure you want to delete the F/T template "${template.name}"? This action cannot be undone.`)) {
      deleteFTTemplateMutation.mutate(template.id);
    }
  };

  const formatScheduleIntervals = (intervalsJson: string): string => {
    try {
      const intervals = JSON.parse(intervalsJson) as number[];
      return intervals.map(w => w === 0 ? 'Initial' : `Week ${w}`).join(', ');
    } catch {
      return 'Invalid format';
    }
  };

  const formatFTCycles = (cyclesJson: string): string => {
    try {
      const cycles = JSON.parse(cyclesJson);
      return `${cycles.length} cycle${cycles.length !== 1 ? 's' : ''}`;
    } catch {
      return 'Invalid format';
    }
  };

  const handleTemplateCreated = () => {
    refetchScheduleTemplates();
    refetchFTTemplates();
    onTemplateUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
          data-testid="button-manage-templates"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Templates
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-gray-600" />
            Template Management
          </DialogTitle>
          <DialogDescription>
            Create, edit, and delete your custom testing schedule and freeze/thaw cycle templates.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            data-testid="tab-schedule-templates"
          >
            <Calendar className="w-4 h-4 mr-2 inline" />
            Testing Schedule Templates
          </button>
          <button
            onClick={() => setActiveTab('ft')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'ft'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            data-testid="tab-ft-templates"
          >
            <Zap className="w-4 h-4 mr-2 inline" />
            Freeze/Thaw Templates
          </button>
        </div>

        {/* Schedule Templates Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Testing Schedule Templates</h3>
              <TemplateBuilder onTemplateCreated={handleTemplateCreated} />
            </div>

            <div className="space-y-2">
              {scheduleTemplates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No custom templates found. Create your first template above.</p>
              ) : (
                scheduleTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                        <h4 className="font-medium text-gray-800">{template.name}</h4>
                        {template.isPreset && (
                          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            Preset
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-blue-600 mt-1">
                        <strong>Intervals:</strong> {formatScheduleIntervals(template.testingIntervals)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!template.isPreset && (
                        <>
                          <TemplateBuilder
                            editTemplate={template}
                            mode="edit"
                            onTemplateCreated={handleTemplateCreated}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteScheduleTemplate(template)}
                            className="text-red-600 hover:text-red-700"
                            disabled={deleteScheduleTemplateMutation.isPending}
                            data-testid={`button-delete-schedule-template-${template.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* F/T Templates Tab */}
        {activeTab === 'ft' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Freeze/Thaw Cycle Templates</h3>
              <FTTemplateBuilder onTemplateCreated={handleTemplateCreated} />
            </div>

            <div className="space-y-2">
              {ftTemplates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No F/T templates found. Create your first template above.</p>
              ) : (
                ftTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Zap className="w-4 h-4 mr-2 text-purple-600" />
                        <h4 className="font-medium text-gray-800">{template.name}</h4>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-purple-600 mt-1">
                        <strong>Cycles:</strong> {formatFTCycles(template.cycles)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <FTTemplateBuilder
                        editTemplate={template}
                        mode="edit"
                        onTemplateCreated={handleTemplateCreated}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFTTemplate(template)}
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteFTTemplateMutation.isPending}
                        data-testid={`button-delete-ft-template-${template.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-close-template-manager"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}