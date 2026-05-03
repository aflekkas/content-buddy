import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

type Props = {
  onContinue: () => void;
};

export function StepWelcome({ onContinue }: Props) {
  return (
    <div className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted/40">
          <LogoMark className="size-6" />
        </div>
        <div className="max-w-xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Riff on the news. Post about your life. In your voice.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Add the feeds you read. Drop a journal note when something matters.
            We draft LinkedIn posts in your voice. You ship.
          </p>
        </div>
        <div>
          <Button type="button" size="lg" onClick={onContinue}>
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
}
