import { Page, PageHeader } from "@/components/layout/PageHeader";
import { ConceptsExplorer } from "@/app/concepts/ConceptsExplorer";

export default async function ConceptsPage({
  searchParams,
}: {
  searchParams: Promise<{ concept?: string }>;
}) {
  const { concept } = await searchParams;

  return (
    <Page width="wide">
      <PageHeader
        title="Concepts"
        description="What NOESIS believes you understand, and how those beliefs depend on each other. Mastery is inferred from your predictions, not from lessons completed."
        className="mb-7"
      />
      <ConceptsExplorer initialConcept={concept ?? null} />
    </Page>
  );
}
