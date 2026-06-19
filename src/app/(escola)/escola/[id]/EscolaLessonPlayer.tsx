"use client";

import { useTransition } from "react";
import VideoPlayer from "@/components/ui/VideoPlayer";
import { completeLessonAction } from "@/app/course-actions";
import type { Lesson } from "@/types";
import type { VideoType } from "@/types";

interface Props {
  lesson: Lesson;
  courseId: string;
  returnPath: string;
}

export default function EscolaLessonPlayer({ lesson, courseId, returnPath }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleCompleted = () => {
    const fd = new FormData();
    fd.set("lessonId",   lesson.id);
    fd.set("courseId",   courseId);
    fd.set("returnPath", returnPath);
    startTransition(async () => {
      await completeLessonAction(fd);
    });
  };

  return (
    <div className="space-y-2">
      <VideoPlayer
        videoType={lesson.video_type as VideoType}
        videoUrl={lesson.video_url}
        lessonId={lesson.id}
        courseId={courseId}
        onCompleted={handleCompleted}
        trackProgress={true}
      />
      {isPending && (
        <p className="text-xs text-iw-success font-medium animate-pulse">
          ✓ Registrando conclusão...
        </p>
      )}
    </div>
  );
}
