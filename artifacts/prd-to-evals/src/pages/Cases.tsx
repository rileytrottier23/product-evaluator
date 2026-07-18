import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  useGetSession, 
  useUpdateCase,
  useGetSessionCoverage,
  getGetSessionQueryKey,
  getGetSessionCoverageQueryKey,
  EvalCaseCategory,
  GeneratedCase,
  GeneratedCaseStatus,
  CaseUpdateStatus,
  ExtractedRequirement
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Pencil, ArrowRight, MessageSquare, ShieldAlert, Sparkles, Box, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function CategoryBadge({ category }: { category: EvalCaseCategory }) {
  const styles: Record<EvalCaseCategory, string> = {
    task_success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-transparent',
    guardrail: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-transparent',
    format: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-transparent',
    tool_use: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-transparent',
  };

  const icons: Record<EvalCaseCategory, React.ReactNode> = {
    task_success: <Check className="w-3 h-3 mr-1" />,
    guardrail: <ShieldAlert className="w-3 h-3 mr-1" />,
    format: <Box className="w-3 h-3 mr-1" />,
    tool_use: <Sparkles className="w-3 h-3 mr-1" />,
  };

  const labels: Record<EvalCaseCategory, string> = {
    task_success: 'Task Success',
    guardrail: 'Guardrail',
    format: 'Format',
    tool_use: 'Tool Use',
  };

  return (
    <Badge variant="outline" className={cn('font-medium px-2 py-0.5', styles[category])}>
      {icons[category]}
      {labels[category]}
    </Badge>
  );
}

function CaseCard({ 
  generatedCase, 
  requirement, 
  sessionId 
}: { 
  generatedCase: GeneratedCase, 
  requirement?: ExtractedRequirement,
  sessionId: string 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCase = useUpdateCase();
  
  const c = generatedCase.case;
  const isApproved = generatedCase.status === 'approved';
  const isDropped = generatedCase.status === 'dropped';

  const handleStatusChange = async (status: CaseUpdateStatus) => {
    try {
      // Optimistic update for UI responsiveness
      queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          cases: old.cases.map((gc: GeneratedCase) => 
            gc.id === generatedCase.id ? { ...gc, status } : gc
          )
        };
      });

      await updateCase.mutateAsync({
        sessionId,
        caseId: generatedCase.id,
        data: { status }
      });
      
      // Invalidate coverage so it updates
      queryClient.invalidateQueries({ queryKey: getGetSessionCoverageQueryKey(sessionId) });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
      toast({
        title: 'Error updating case status',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12 border-b last:border-0 last:pb-0">
      <div className="lg:col-span-4 lg:pr-6 space-y-3 opacity-70 hover:opacity-100 transition-opacity">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
          Source Requirement
        </div>
        {requirement ? (
          <>
            <div className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block">
              {requirement.requirementId}
            </div>
            <p className="text-sm leading-relaxed">{requirement.text}</p>
          </>
        ) : (
          <p className="text-sm italic text-muted-foreground">Requirement not found</p>
        )}
      </div>

      <div className={cn(
        "lg:col-span-8 rounded-xl border bg-card shadow-sm transition-all duration-300 relative overflow-hidden",
        isApproved && "border-green-500/50 shadow-green-500/10 dark:border-green-500/30",
        isDropped && "opacity-50 grayscale-[0.5]"
      )}>
        {isApproved && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 dark:bg-green-600" />
        )}

        <div className="p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {c.id}
                </span>
                <CategoryBadge category={c.category} />
                <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/30 text-muted-foreground uppercase">
                  {generatedCase.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-base">{c.description}</h3>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 bg-muted/50 p-1 rounded-lg">
              <Button 
                variant={isApproved ? "default" : "ghost"} 
                size="sm" 
                className={cn("h-8 px-3 text-xs", isApproved && "bg-green-600 hover:bg-green-700 text-white")}
                onClick={() => handleStatusChange('approved')}
                data-testid={`btn-approve-${generatedCase.id}`}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Approve
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                title="Edit Case"
                data-testid={`btn-edit-${generatedCase.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant={isDropped ? "secondary" : "ghost"} 
                size="sm" 
                className={cn("h-8 px-3 text-xs", isDropped && "text-muted-foreground")}
                onClick={() => handleStatusChange('dropped')}
                data-testid={`btn-drop-${generatedCase.id}`}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Drop
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-muted/50">
              <div className="text-xs font-medium text-muted-foreground uppercase flex items-center">
                <MessageSquare className="w-3 h-3 mr-1.5" /> Test Prompt
              </div>
              <div className="font-mono text-sm whitespace-pre-wrap pl-4 border-l-2 border-primary/20 text-foreground/90">
                {c.input.messages[0]?.content || 'No prompt provided'}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase">Expected Behaviour</div>
                <div className="text-sm bg-background border rounded-md p-2.5">
                  {c.expected.behaviour}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground uppercase">Grading Rubric</div>
                <div className="text-sm bg-background border rounded-md p-2.5 text-muted-foreground">
                  {c.expected.graders[0]?.rubric || 'No rubric'}
                </div>
              </div>
            </div>
          </div>

          {generatedCase.generatorNotes && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground -ml-2 hover:bg-transparent hover:text-foreground">
                  <Info className="w-3 h-3 mr-1.5" />
                  View Generator Notes
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md border italic">
                {generatedCase.generatorNotes}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const [, params] = useRoute('/session/:id/cases');
  const sessionId = params?.id;
  const [, setLocation] = useLocation();

  const { data: session, isLoading: isSessionLoading } = useGetSession(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId!),
    },
  });

  const { data: coverage, isLoading: isCoverageLoading } = useGetSessionCoverage(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionCoverageQueryKey(sessionId!),
    },
  });

  if (isSessionLoading || !session) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const cases = session.cases || [];
  const requirementsMap = new Map(session.requirements?.map(r => [r.requirementId, r]));
  
  const canExport = cases.some(c => c.status === 'approved');

  return (
    <div className="max-w-6xl mx-auto py-6 pb-24">
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur py-4 mb-8 border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Review Generated Cases</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
              {isCoverageLoading ? (
                <Skeleton className="h-4 w-64" />
              ) : coverage ? (
                <>
                  <span className="font-medium">{coverage.totalApproved} approved</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{coverage.totalDraft} draft</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{coverage.totalDropped} dropped</span>
                  <span className="text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded-full">
                    {coverage.categoryDistribution.task_success || 0} task · {coverage.categoryDistribution.guardrail || 0} guardrail
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <Button 
            size="lg" 
            disabled={!canExport}
            onClick={() => setLocation(`/session/${sessionId}/export`)}
            data-testid="button-review-complete"
          >
            Review Complete
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {!isCoverageLoading && coverage && coverage.uncoveredRequirements.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">Missing Coverage</span>
              {coverage.uncoveredRequirements.length} requirements have no approved cases.
            </div>
          </div>
        )}
      </div>

      <div className="space-y-12">
        {cases.map(gc => (
          <CaseCard 
            key={gc.id} 
            generatedCase={gc} 
            requirement={requirementsMap.get(gc.sourceRequirementId)} 
            sessionId={sessionId!}
          />
        ))}

        {cases.length === 0 && (
          <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground">No cases generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
