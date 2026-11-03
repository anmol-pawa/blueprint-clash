import { notFound } from "next/navigation";
import { ALL_LESSONS, lessonById } from "@/content/lessons/registry";
import { LessonClient } from "./LessonClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${lessonById(id)?.title ?? "Lesson"}: Blueprint Clash` };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = lessonById(id);
  if (!lesson) notFound();
  const i = ALL_LESSONS.indexOf(lesson);
  return <LessonClient lesson={lesson} nextId={ALL_LESSONS[i + 1]?.id ?? null} />;
}
