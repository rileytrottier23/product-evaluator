import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useGetSession } from '@workspace/api-client-react';
import { getGetSessionQueryKey } from '@workspace/api-client-react';

const STAGES = [
  { id: 'input', label: '1. Input', path: '/' },
  { id: 'requirements', label: '2. Requirements', path: '/session/:id/requirements' },
  { id: 'cases', label: '3. Review Cases', path: '/session/:id/cases' },
  { id: 'export', label: '4. Export', path: '/session/:id/export' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const sessionIdMatch = location.match(/\/session\/([^\/]+)/);
  const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

  const { data: session } = useGetSession(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId!),
    },
  });

  const getStageStatus = (stageId: string, index: number) => {
    // 0 is input
    if (stageId === 'input' && location === '/') return 'current';
    if (location === '/') return 'upcoming';

    if (!sessionId) return 'upcoming';

    // If we have a sessionId, we check the path
    const stagePath = STAGES[index].path.replace(':id', sessionId);
    
    // Find current index
    const currentIndex = STAGES.findIndex(s => s.path.replace(':id', sessionId) === location || (s.id === 'input' && location === '/'));
    
    if (index === currentIndex) return 'current';
    if (index < currentIndex) return 'complete';
    return 'upcoming';
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center gap-8 px-4">
          <Link href="/" className="font-semibold text-primary tracking-tight shrink-0 flex items-center gap-2" data-testid="link-home">
            <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              PE
            </div>
            PRD-to-Evals
          </Link>
          
          <nav className="flex-1 flex items-center justify-center">
            <ol className="flex items-center space-x-2 text-sm font-medium sm:space-x-4">
              {STAGES.map((stage, index) => {
                const status = getStageStatus(stage.id, index);
                const path = sessionId ? stage.path.replace(':id', sessionId) : (index === 0 ? '/' : '#');
                
                return (
                  <li key={stage.id} className="flex items-center">
                    {index !== 0 && (
                      <div className="h-px w-4 sm:w-8 bg-border mr-2 sm:mr-4" aria-hidden="true" />
                    )}
                    
                    {status === 'complete' || status === 'current' ? (
                      <Link 
                        href={path}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          status === 'current' ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                        )}
                        data-testid={`stepper-${stage.id}`}
                      >
                        {status === 'complete' && (
                          <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                        <span>{stage.label}</span>
                      </Link>
                    ) : (
                      <div 
                        className="flex items-center gap-2 text-muted-foreground/60 cursor-not-allowed"
                        data-testid={`stepper-${stage.id}-disabled`}
                      >
                        <span>{stage.label}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="shrink-0 w-32 flex justify-end">
             {session?.specTitle && (
                <div className="text-xs text-muted-foreground truncate max-w-[120px]" title={session.specTitle}>
                  {session.specTitle}
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
