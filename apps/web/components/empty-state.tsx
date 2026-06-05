import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/icon";

/** Placeholder used by module pages that are scaffolded in Phase 1 and built
 *  out in later phases. */
export function EmptyState({
  icon,
  title,
  description,
  phase,
}: {
  icon: string;
  title: string;
  description: string;
  phase?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon name={icon} className="h-6 w-6 text-muted-foreground" />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {phase ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
            {phase}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
