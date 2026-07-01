import { cn } from "@/lib/utils";

interface Hero157Props {
  eyebrow: string;
  heading: string;
  body: string;
  className?: string;
}

const Hero157 = ({ eyebrow, heading, body, className }: Hero157Props) => {
  return (
    <section
      className={cn(
        "dark relative h-[90svh] max-h-[1400px] w-full overflow-hidden bg-zinc-950 py-12 md:py-20",
        className,
      )}
    >
      <div className="relative container mx-auto h-full w-full px-6">
        <div className="flex h-full w-full flex-col justify-end gap-12">
          <div className="flex max-w-[61.375rem] flex-col gap-1">
            <p className="text-sm leading-none text-muted-foreground uppercase">
              {eyebrow}
            </p>
            <h1 className="text-3xl leading-snug! text-foreground md:text-4xl lg:text-6xl">
              {heading}
            </h1>
          </div>
          <p className="max-w-[20.25rem] border-l border-muted-foreground pl-6 text-base text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
};

export { Hero157 };
