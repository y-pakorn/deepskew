import type { Metadata } from "next";
import { DocArticle } from "@/components/docs/doc-ui";
import { GlossaryReference } from "@/components/docs/glossary-reference";

export const metadata: Metadata = {
  title: "Docs · Glossary",
  description:
    "Every term in the deepskew desk, grouped by area with its definition and math — the same glossary that powers the inline tooltips.",
  alternates: { canonical: "/docs/glossary" },
};

export default function GlossaryPage() {
  return (
    <DocArticle
      eyebrow="Reference"
      title="Glossary"
      lead="Every label, value, and parameter in the desk, defined and grouped by area. This is the same glossary that powers the inline tooltips, rendered in full with its math."
    >
      <GlossaryReference />
    </DocArticle>
  );
}
