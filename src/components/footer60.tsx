import {
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaTwitter,
} from "react-icons/fa";
import { cn } from "@/lib/utils";

interface FooterLink {
  name: string;
  href: string;
}
interface FooterSection {
  title: string;
  links: FooterLink[];
}
interface FooterSocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}
interface FooterLogo {
  url: string;
  src: string;
  alt: string;
  title: string;
}

interface FooterCompactProps {
  logo?: FooterLogo;
  sections?: FooterSection[];
  socialLinks?: FooterSocialLink[];
  className?: string;
}

interface Footer60Props extends FooterCompactProps {}
type Props = Partial<Footer60Props>;

const defaultProps: Footer60Props = {
  logo: {
    url: "https://www.shadcnblocks.com",
    src: "/images/logo/shadcnblocks-logo-word.svg",
    alt: "logo",
    title: "Shadcnblocks.com",
  },
  sections: [
    {
      title: "Menu",
      links: [
        { name: "Home", href: "#" },
        { name: "Features", href: "#" },
        { name: "About", href: "#" },
        { name: "Pricing", href: "#" },
        { name: "Blog", href: "#" },
        { name: "Contact", href: "#" },
      ],
    },
  ],
  socialLinks: [
    {
      icon: <FaInstagram className="size-5" />,
      href: "#",
      label: "Instagram",
    },
    { icon: <FaFacebook className="size-5" />, href: "#", label: "Facebook" },
    { icon: <FaTwitter className="size-5" />, href: "#", label: "Twitter" },
    { icon: <FaLinkedin className="size-5" />, href: "#", label: "LinkedIn" },
    { icon: <FaGithub className="size-5" />, href: "#", label: "GitHub" },
  ],
  copyright: undefined,
  legalLinks: undefined,
};

const MAX_SECTIONS = 1;

const Footer60 = (props: Props) => {
  const { logo, sections, socialLinks, className } = {
    ...defaultProps,
    ...props,
  };

  const visibleSections = (sections ?? []).slice(0, MAX_SECTIONS);
  const quickLinks = visibleSections.flatMap((s) => s.links);

  return (
    <section className={cn("py-8 lg:py-10", className)}>
      <div className="container mx-auto">
        <footer>
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
            <a
              href={logo?.url ?? "#"}
              className="inline-flex shrink-0 items-center font-semibold"
            >
              {logo?.src ? (
                <img
                  src={logo.src}
                  alt={logo.alt ?? ""}
                  title={logo.title ?? ""}
                  className="h-6 dark:invert"
                />
              ) : (
                <span>{logo?.title}</span>
              )}
            </a>
            <nav
              aria-label="Footer"
              className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground lg:flex-1 lg:justify-center"
            >
              {quickLinks.map((link, idx) => (
                <a
                  key={`${idx}-${link.name}-${link.href}`}
                  href={link.href}
                  className="hover:text-primary"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            {socialLinks && socialLinks.length > 0 ? (
              <ul className="flex w-full flex-wrap items-center justify-center gap-3 text-muted-foreground lg:w-auto lg:justify-end">
                {socialLinks.map((social, idx) => (
                  <li key={idx} className="font-medium hover:text-primary">
                    <a href={social.href} aria-label={social.label}>
                      <span className="[&_svg]:size-4">{social.icon}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </footer>
      </div>
    </section>
  );
};

export { Footer60 };
