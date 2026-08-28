import { Page } from "@/components/layout/PageHeader";
import { LearnSession } from "@/app/learn/LearnSession";
import { CURRENT_LESSON_ID, LESSONS_BY_ID } from "@/mock/lessons";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { lesson } = await searchParams;
  const lessonId = lesson && lesson in LESSONS_BY_ID ? lesson : CURRENT_LESSON_ID;

  return (
    <Page width="wide">
      <LearnSession lessonId={lessonId} />
    </Page>
  );
}
