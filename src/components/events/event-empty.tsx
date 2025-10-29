import { AlertCircle, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EventEmptyProps {
  isError?: boolean;
  errorMessage?: string;
}

export function EventEmpty({ isError, errorMessage }: EventEmptyProps) {
  if (isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {errorMessage || "Failed to load events. Retrying..."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        No Events Yet
      </h3>
      <p className="text-xs text-muted-foreground/70">
        Waiting for marketplace activity...
      </p>
    </div>
  );
}
