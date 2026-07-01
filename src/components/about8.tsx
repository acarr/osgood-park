import { cn } from "@/lib/utils";

interface About8Props {
  className?: string;
}

const About8 = ({ className }: About8Props) => {
  return (
    <section className={cn("border-t border-border py-24 md:py-32", className)}>
      <div className="container mx-auto px-6">
        <div className="mx-auto flex flex-col-reverse gap-8 md:grid md:grid-cols-2 md:items-center md:gap-12">
          {/* Text on the left */}
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              A few words about us
            </h2>
            <p className="text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam a
              euismod nisi, vitae ultricies enim. Curabitur eu velit nec lorem
              tincidunt fermentum.
            </p>
            <p className="text-muted-foreground">
              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip.
            </p>
          </div>

          {/* Image on the right */}
          <img
            src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg"
            alt="Placeholder"
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export { About8 };
