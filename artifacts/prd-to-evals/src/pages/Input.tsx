import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useCreateSession, useExtractRequirements } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, FileText, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SAMPLE_SPEC = `# Billing Agent Spec

The billing agent must issue refunds for double-charges within the 30-day window.
It must not issue refunds for requests older than 30 days, and must explain the policy when declining.
The agent should respond in the same language as the customer.
Be helpful to customers at all times.
When issuing a refund, the agent must call the process_refund tool with the correct order ID.`;

export default function InputPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [specText, setSpecText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSession = useCreateSession();
  const extractRequirements = useExtractRequirements();

  const handleLoadSample = () => {
    setSpecText(SAMPLE_SPEC);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSpecText(event.target?.result as string);
    };
    reader.readAsText(file);
    
    // Reset so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!specText.trim()) {
      toast({
        title: 'Spec is empty',
        description: 'Please paste or upload a spec to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create session
      const session = await createSession.mutateAsync({
        data: { specText },
      });

      // 2. Extract requirements
      await extractRequirements.mutateAsync({
        sessionId: session.id,
      });

      // 3. Navigate
      setLocation(`/session/${session.id}/requirements`);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error processing spec',
        description: 'An error occurred while creating the session or extracting requirements.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Turn requirements into test cases</h1>
        <p className="text-muted-foreground text-lg">
          Paste your Product Requirements Document (PRD) to automatically generate structured LLM evaluation cases.
        </p>
      </div>

      <div className="space-y-6 bg-card border shadow-sm rounded-xl p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="spec" className="text-base font-semibold">Paste your spec</Label>
            <Button variant="outline" size="sm" onClick={handleLoadSample} data-testid="button-load-sample">
              <FileText className="w-4 h-4 mr-2" />
              Load sample spec
            </Button>
          </div>
          <Textarea
            id="spec"
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            placeholder="e.g. The billing agent must issue refunds for double-charges within the 30-day window..."
            className="min-h-[300px] font-mono text-sm leading-relaxed"
            disabled={isProcessing}
            data-testid="textarea-spec"
          />
          <p className="text-sm text-muted-foreground pt-2">
            Scope: this tool generates evals for AI agent features. Non-AI specs can be parsed but the eval format assumes an agent under test.
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div>
          <input 
            type="file" 
            accept=".txt,.md" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            data-testid="input-file"
          />
          <Button 
            variant="secondary" 
            className="w-full border-dashed border-2 py-8 h-auto flex flex-col gap-2 bg-transparent hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            data-testid="button-upload"
          >
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="font-medium">Upload .txt or .md file</span>
            <span className="text-xs text-muted-foreground font-normal">Max 5MB</span>
          </Button>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button 
            size="lg" 
            onClick={handleSubmit} 
            disabled={isProcessing || !specText.trim()}
            className="w-full sm:w-auto"
            data-testid="button-submit-spec"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reading your spec...
              </>
            ) : (
              <>
                Extract Requirements
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
