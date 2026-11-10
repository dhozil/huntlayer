import { CheckCircle2, XCircle, Loader2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPLORER_TX_URL } from "@/lib/config";

export type TxState = { status: "idle"|"pending"|"success"|"error"; hash?: string; message?: string };

export function TxStatus({ state, onReset }: { state: TxState; onReset?: () => void }) {
  if (state.status === "idle") return null;
  const copy = () => state.hash && navigator.clipboard.writeText(state.hash);
  return (
    <div className={`mt-4 rounded-lg border p-4 text-sm ${state.status==="success"?"border-zinc-400/30 bg-zinc-400/10": state.status==="error"?"border-red-500/30 bg-red-500/10":"border-primary/30 bg-primary/10"}`}>
      <div className="flex items-start gap-3">
        {state.status==="pending" && <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5" />}
        {state.status==="success" && <CheckCircle2 className="h-5 w-5 text-zinc-200 mt-0.5" />}
        {state.status==="error" && <XCircle className="h-5 w-5 text-red-400 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {state.status==="pending" && "Transaction pending... (waiting for consensus)"}
            {state.status==="success" && "Transaction successful"}
            {state.status==="error" && "Transaction failed"}
          </p>
          {state.message && <p className="mt-1 text-muted-foreground break-words">{state.message}</p>}
          {state.hash && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="text-xs bg-background/50 px-2 py-1 rounded break-all">{state.hash}</code>
              <button onClick={copy} className="text-muted-foreground hover:text-foreground" title="Copy hash"><Copy className="h-4 w-4"/></button>
              <a href={`${EXPLORER_TX_URL}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                View in Studio <ExternalLink className="h-3 w-3"/>
              </a>
            </div>
          )}
          {onReset && state.status!=="pending" && <Button variant="ghost" size="sm" className="mt-2" onClick={onReset}>Dismiss</Button>}
        </div>
      </div>
    </div>
  );
}
