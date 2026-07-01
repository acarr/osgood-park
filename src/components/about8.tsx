import { cn } from "@/lib/utils";

interface About8Props {
  heading: string;
  /** One or more paragraphs, separated by a blank line. */
  body: string;
  image: { src: string; alt: string };
  className?: string;
}

const About8 = ({ heading, body, image, className }: About8Props) => {
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim() !== "");

  return (
    <section className={cn("border-t border-border py-24 md:py-32", className)}>
      <div className="container mx-auto px-6">
        <div className="mx-auto flex flex-col-reverse gap-8 md:grid md:grid-cols-2 md:items-center md:gap-12">
          {/* Text on the left */}
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {heading}
            </h2>
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Image on the right */}
          <img
            src={image.src}
            alt={image.alt}
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export { About8 };
