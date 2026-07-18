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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
      <div className="w-full py-8 space-y-4">
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

  const typeColors: Record<ExtractedRequirementType, string> = {
    capability: '#2563eb',
    constraint: '#f59e0b',
    format: '#9333ea',
    tool_use: '#22c55e',
    non_testable: '#94a3b8'
  };

  const typePillStyles: Record<ExtractedRequirementType, string> = {
    capability: 'bg-blue-50 text-blue-700',
    constraint: 'bg-amber-50 text-amber-700',
    format: 'bg-purple-50 text-purple-700',
    tool_use: 'bg-green-50 text-green-700',
    non_testable: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="w-full py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 w-full">
        <div>
          <div className="text-[#2563eb] font-mono text-[10px] uppercase tracking-[0.4em] mb-2">REQUIREMENTS</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Review & Select</h1>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#64748b]">
            {requirements.length} requirements · {testableCount} testable · {nonTestableCount} non-testable
          </div>
        </div>
        <button 
          onClick={handleGenerate} 
          disabled={isGenerating || includedIds.length === 0}
          className="bg-[#0f172a] text-white font-mono text-[11px] uppercase tracking-widest rounded-full px-6 py-3 flex items-center hover:bg-[#2563eb] disabled:opacity-50 disabled:hover:bg-[#0f172a] transition-colors"
          data-testid="button-generate-cases"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              GENERATING...
            </>
          ) : (
            <>
              GENERATE CASES
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {requirements.map(req => (
          <div 
            key={req.requirementId}
            className={cn(
              "bg-white rounded-xl border border-black/5 shadow-sm card-hover p-5 relative overflow-hidden flex flex-row gap-4 transition-all",
              !req.included && "opacity-60",
              req.type === 'non_testable' && "opacity-50"
            )}
            data-testid={`req-row-${req.requirementId}`}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: typeColors[req.type] }} />
            
            <div className="flex-1 flex flex-col justify-center py-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[10px] bg-[#f1f5f9] px-2 py-0.5 rounded text-[#64748b]">
                  {req.requirementId}
                </span>
                <span className={cn("rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest", typePillStyles[req.type])}>
                  {req.type.replace('_', '-')}
                </span>
              </div>
              
              <p className={cn("font-sans text-sm text-[#0f172a] leading-relaxed", !req.included && "text-[#64748b]")}>
                {req.text}
              </p>

              {req.ambiguityFlag && req.suggestedRewrite && (
                <Collapsible className="mt-4">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-100 transition-colors">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                      Ambiguous — View suggestion
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 text-sm bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900">
                    <span className="font-semibold block mb-1">Suggested rewrite for clarity:</span>
                    {req.suggestedRewrite}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            <div className="shrink-0 flex items-center pr-2">
              <Switch 
                checked={req.included} 
                onCheckedChange={() => handleToggle(req.requirementId, req.included)}
                disabled={isGenerating}
                data-testid={`switch-${req.requirementId}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}