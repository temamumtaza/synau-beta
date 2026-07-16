import { NewCourseForm } from '@/features/courses/new-course-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft className="h-3 w-3" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Kursus Baru
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          AI akan merancang roadmap, mengumpulkan referensi tepercaya, dan
          membuatkan lesson pertamamu secara otomatis.
        </p>
      </div>

      <NewCourseForm />
    </div>
  );
}
