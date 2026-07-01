# Editing the website text

All of the words on the site live in this folder. You can change them here
without touching any code.

## The files

| File             | What it controls                                                        |
| ---------------- | ----------------------------------------------------------------------- |
| `home.yaml`      | Every section of the home page: the banner, the about text, section headings, the labels on the Tides & Water cards, and the footer. |
| `documents.yaml` | The list of downloadable forms and documents in the "Forms" section.    |

To change a headline, a paragraph, a label, or a link, open the matching file,
edit the text **inside the quotation marks**, and save.

## How these files work (YAML)

These are plain text files in a format called YAML. A few rules keep them happy:

- **Only change the text to the right of the colon**, inside the quotes.
  Leave the labels on the left (like `heading:` or `title:`) alone.
- **Keep the indentation.** The leading spaces matter — don't add or remove them.
- **Keep the quotes** around text, especially if your text contains a colon (`:`).
- **Blank line = new paragraph.** In the About section's `body`, leave a blank
  line between paragraphs and they'll render as separate paragraphs.
- Lines starting with `#` are notes/instructions and are ignored by the site.

## Adding a document

1. Put the PDF in the `public/forms/` folder.
2. In `documents.yaml`, copy one existing block and change the details. Give it a
   new, unique `id` (lowercase words joined by hyphens). The `href` is the path
   to the file, e.g. `/forms/your-file.pdf`.

## If the site won't build

If you leave a required field blank or break the indentation, the build will
stop and tell you **which field** in **which file** has a problem. Fix that
field and it will build again. Nothing you do here can break the code itself.

## What is NOT edited here

The live tide times (from NOAA) and water-quality readings (from the MA DPH
dashboard) are pulled in automatically. Their plumbing lives in `src/data/` and
`src/lib/` — leave those alone. This folder only controls the fixed wording
around them (headings, card titles, labels).
