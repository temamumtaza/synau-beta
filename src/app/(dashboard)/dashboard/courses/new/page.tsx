import { NewCourseForm } from '@/features/courses/new-course-form';
import { PageHeader } from '@/components/layout/primitives';

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-xl space-y-10">
      <PageHeader
        title="Kursus Baru"
        description="AI akan merancang roadmap, mengumpulkan referensi tepercaya, dan membuatkan lesson pertamamu."
        back={{ href: '/dashboard', label: 'Dashboard' }}
      />
      <NewCourseForm />
    </div>
  );
}
