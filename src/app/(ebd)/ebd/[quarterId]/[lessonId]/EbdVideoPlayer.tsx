"use client";

import VideoPlayer from "@/components/ui/VideoPlayer";
import type { VideoType } from "@/types";

interface Props {
  videoType: VideoType;
  videoUrl?: string | null;
}

export default function EbdVideoPlayer({ videoType, videoUrl }: Props) {
  if (!videoUrl || videoType === "none") return null;

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg">
      <VideoPlayer
        videoType={videoType}
        videoUrl={videoUrl}
        trackProgress={false}
      />
    </div>
  );
}
