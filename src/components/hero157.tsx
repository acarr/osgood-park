import { MoveUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Hero157Props {
  className?: string;
}

const Hero157 = ({ className }: Hero157Props) => {
  return (
    <section
      className={cn(
        "dark relative h-svh max-h-[1400px] w-full overflow-hidden bg-[url('/images/hero.jpg')] bg-cover bg-center bg-no-repeat py-12 after:absolute after:top-0 after:left-0 after:block after:h-full after:w-full after:bg-black/65 after:content-[''] md:py-20",
        className,
      )}
    >
      <div className="relative z-20 container h-full w-full max-w-[85rem]">
        <div className="flex h-full w-full flex-col justify-end gap-12">
          <div className="flex max-w-[61.375rem] flex-col gap-1">
            <p className="text-sm leading-none text-muted-foreground uppercase">
              Salem, Massachusetts
            </p>
            <h1 className="text-3xl leading-snug! text-foreground md:text-4xl lg:text-6xl">
              Welcome to the Osgood-Park Neighborhood Association
            </h1>
          </div>
          <div className="flex w-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <p className="max-w-[20.25rem] border-l border-muted-foreground pl-6 text-base text-muted-foreground">
              A community of neighbors looking after our shared corner of Salem
              Sound — its park, its waterfront, and each other.
            </p>
            <div className="shrink-0">
              <Button variant="outline" className="group flex h-fit w-fit items-center gap-3 rounded-full border border-muted-foreground/40 bg-transparent px-6 py-4 text-sm text-foreground uppercase hover:bg-transparent" render={<a href="#about" />} nativeButton={false}><p className="group-hover:underline">Learn more</p><MoveUpRight className="h-4! w-4! fill-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" /></Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero157 };
