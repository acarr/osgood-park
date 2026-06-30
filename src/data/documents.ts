// Downloadable documents for the Forms section. Drop the real PDFs into
// public/forms/ and update the hrefs (placeholder copies are seeded there now).

export interface DocumentLink {
  title: string;
  description: string;
  href: string;
  fileType: string;
}

export const documents: DocumentLink[] = [
  {
    title: "Membership Form",
    description:
      "Join the Osgood-Park Neighborhood Association or renew your membership for the year.",
    href: "/forms/membership-form.pdf",
    fileType: "PDF",
  },
  {
    title: "Event Permit Request",
    description:
      "Request approval to host a gathering, cleanup, or event at the park.",
    href: "/forms/event-permit-request.pdf",
    fileType: "PDF",
  },
  {
    title: "Meeting Minutes",
    description:
      "Minutes and notes from recent neighborhood association meetings.",
    href: "/forms/meeting-minutes.pdf",
    fileType: "PDF",
  },
  {
    title: "Association Bylaws",
    description:
      "The association's current bylaws and governing documents.",
    href: "/forms/bylaws.pdf",
    fileType: "PDF",
  },
];
