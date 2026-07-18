import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  useGetSession, 
  useUpdateRequirement, 
  useGenerateCases,
  getGetSessionQueryKey,
  ExtractedRequirementType,
  ExtractedRequirement
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function RequirementTypeBadge({ type }: { type: ExtractedRequirementType }) {
  const styles: Record<ExtractedRequirementType, string> = {
    capability: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100',
    constraint: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100',
    format: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-100',
    tool_use: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100',
    non_testable: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-100',
  };

  const labels: Record<ExtractedRequirementType, string> = {
    capability: 'Capability',
    constraint: 'Constraint',
    format: 'Format',
    tool_use: 'Tool Use',
    non_testable: 'Non-Testable',
  };

  return (
    <Badge variant="secondary" className={cn('border-transparent font-medium', styles[type])}>
      {labels[type]}
    </Badge>
  );
}

export default function RequirementsPage() {
  const [, params] = useRoute('/session/:id/requirements');
  const sessionId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isGenerating, setIsGenerating] = useState(false);

  const { data: session, isLoading } = useGetSession(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId!),
    },
  });

  const updateRequirement = useUpdateRequirement();
  const generateCases = useGenerateCases();

  if (isLoading || !session) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <Skeleton className="h-12 w-full max-w-sm mb-8" />
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const requirements = session.requirements || [];
  const testableCount = requirements.filter(r => r.testable).length;
  const nonTestableCount = requirements.length - testableCount;
  const includedIds = requirements.filter(r => r.included).map(r => r.requirementId);

  const handleToggle = async (reqId: string, currentlyIncluded: boolean) => {
    try {
      // Optimistic update
      queryClient.setQueryData(getGetSessionQueryKey(sessionId!), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          requirements: old.requirements.map((r: ExtractedRequirement) => 
            r.requirementId === reqId ? { ...r, included: !currentlyIncluded } : r
          )
        };
      });

      await updateRequirement.mutateAsync({
        sessionId: sessionId!,
        requirementId: reqId,
        data: { included: !currentlyIncluded },
      });
    } catch (error) {
      // Revert on error by invalidating
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId!) });
      toast({
        title: 'Error updating requirement',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async () => {
    if (includedIds.length === 0) {
      toast({
        title: 'No requirements selected',
        description: 'Please include at least one requirement to generate test cases.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateCases.mutateAsync({
        sessionId: sessionId!,
        data: { requirementIds: includedIds }
      });
      setLocation(`/session/${sessionId}/cases`);
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'An error occurred while generating eval cases.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Requirements</h1>
          <p className="text-muted-foreground mt-1">
            {requirements.length} requirements found — {testableCount} testable, {nonTestableCount} non-testable.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={handleGenerate} 
          disabled={isGenerating || includedIds.length === 0}
          data-testid="button-generate-cases"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating cases for {includedIds.length} reqs...
            </>
          ) : (
            <>
              Generate Eval Cases
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {requirements.map(req => (
          <div 
            key={req.requirementId}
            className={cn(
              "flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card transition-colors",
              !req.included && "opacity-60 bg-muted/30",
              req.type === 'non_testable' && "opacity-50"
            )}
            data-testid={`req-row-${req.requirementId}`}
          >
            <div className="flex items-start gap-4 flex-1">
              <div className="pt-1">
                <Switch 
                  checked={req.included} 
                  onCheckedChange={() => handleToggle(req.requirementId, req.included)}
                  disabled={isGenerating}
                  data-testid={`switch-${req.requirementId}`}
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {req.requirementId}
                  </span>
                  <RequirementTypeBadge type={req.type} />
                </div>
                
                <p className={cn(
                  "text-base leading-relaxed",
                  !req.included && "text-muted-foreground"
                )}>
                  {req.text}
                </p>

                {req.ambiguityFlag && req.suggestedRewrite && (
                  <Collapsible className="mt-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Ambiguous — View suggestion
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-100 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
                      <span className="font-semibold block mb-1">Suggested rewrite for clarity:</span>
                      {req.suggestedRewrite}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
