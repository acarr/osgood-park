// Content collections — the editable text for the site lives in src/content/*.yaml
// and is validated against these schemas at build time. If a required field is
// missing or mistyped, the build fails with a message naming the field.
//
// Edit the words in src/content/home.yaml and src/content/documents.yaml.
// You should not need to touch this file to change copy.

import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

// All of the page's copy, as a single `home` entry (see src/content/home.yaml).
const page = defineCollection({
  loader: file("src/content/home.yaml"),
  schema: z.object({
    meta: z.object({
      title: z.string(),
      description: z.string(),
    }),
    hero: z.object({
      eyebrow: z.string(),
      heading: z.string(),
      body: z.string(),
    }),
    about: z.object({
      heading: z.string(),
      // One or more paragraphs, separated by a blank line.
      body: z.string(),
      image: z.object({
        src: z.string(),
        alt: z.string(),
      }),
    }),
    tides: z.object({
      // Section header (above both cards)
      heading: z.string(),
      intro: z.string(),
      // Tides card
      cardTitle: z.string(),
      cardSubtitle: z.string(),
    }),
    water: z.object({
      cardTitle: z.string(),
      cardSubtitle: z.string(),
      statusOpen: z.string(),
      statusClosed: z.string(),
      statusUnknown: z.string(),
      latestLabel: z.string(),
      historyLabel: z.string(),
      contaminant: z.string(),
      unavailable: z.string(),
      noReadings: z.string(),
      dashboardLinkText: z.string(),
    }),
    forms: z.object({
      heading: z.string(),
      intro: z.string(),
    }),
    footer: z.object({
      orgName: z.string(),
      menuTitle: z.string(),
      links: z.array(
        z.object({
          label: z.string(),
          href: z.string(),
        }),
      ),
    }),
  }),
});

// The downloadable documents shown in the Forms section.
const documents = defineCollection({
  loader: file("src/content/documents.yaml"),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    href: z.string(),
    fileType: z.string(),
  }),
});

export const collections = { page, documents };
