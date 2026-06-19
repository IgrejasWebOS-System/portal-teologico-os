"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Bot, FileText } from "lucide-react";
import type { VideoType } from "@/types";

interface Props {
  videoType: VideoType;
  videoUrl?: string | null;
  lessonId?: string;
  courseId?: string;
  onCompleted?: () => void;
  /** If true, fires onCompleted when 90% of video is watched */
  trackProgress?: boolean;
}

// Extract YouTube video ID
function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

// ── YouTube player ────────────────────────────────────────────────────────────
function YouTubePlayer({
  url,
  onCompleted,
  trackProgress = true,
}: {
  url: string;
  onCompleted?: () => void;
  trackProgress?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef    = useRef<any>(null);
  const trackedRef   = useRef(false);
  const intervalRef  = useRef<number | null>(null);
  const videoId      = getYouTubeId(url);

  useEffect(() => {
    if (!videoId) return;

    function onYTReady() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(containerRef.current!, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.PLAYING) {
              if (!trackProgress || !onCompleted) return;
              intervalRef.current = window.setInterval(() => {
                if (!playerRef.current) return;
                const current  = playerRef.current.getCurrentTime();
                const duration = playerRef.current.getDuration();
                if (duration > 0 && current / duration >= 0.9 && !trackedRef.current) {
                  trackedRef.current = true;
                  onCompleted();
                  if (intervalRef.current) clearInterval(intervalRef.current);
                }
              }, 2000);
            } else {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }
          },
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.YT && w.YT.Player) {
      onYTReady();
    } else {
      w.onYouTubeIframeAPIReady = onYTReady;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src   = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy();
    };
  }, [videoId, onCompleted, trackProgress]);

  if (!videoId) {
    return (
      <div className="aspect-video bg-iw-bg flex items-center justify-center rounded-xl border border-iw-border text-iw-muted text-sm">
        URL do YouTube inválida
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// ── Direct video (CDN) ────────────────────────────────────────────────────────
function DirectPlayer({
  url,
  onCompleted,
  trackProgress = true,
}: {
  url: string;
  onCompleted?: () => void;
  trackProgress?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackedRef = useRef(false);

  const handleTimeUpdate = () => {
    if (!trackProgress || !onCompleted || trackedRef.current) return;
    const el = videoRef.current;
    if (!el) return;
    if (el.duration > 0 && el.currentTime / el.duration >= 0.9) {
      trackedRef.current = true;
      onCompleted();
    }
  };

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
      <video
        ref={videoRef}
        src={url}
        controls
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}

// ── Main VideoPlayer ──────────────────────────────────────────────────────────
export default function VideoPlayer({
  videoType,
  videoUrl,
  onCompleted,
  trackProgress = true,
}: Props) {
  const [playing, setPlaying] = useState(false);

  if (videoType === "none" || !videoUrl) {
    return (
      <div className="aspect-video rounded-xl bg-iw-bg border border-iw-border flex flex-col items-center justify-center gap-3 text-iw-muted">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Conteúdo escrito — sem vídeo</p>
      </div>
    );
  }

  if (videoType === "virtual") {
    return (
      <div className="aspect-video rounded-xl bg-iw-bg border border-iw-border flex flex-col items-center justify-center gap-3 text-iw-muted">
        <Bot className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">Vídeo com professor virtual</p>
        <p className="text-xs opacity-60">Em produção — disponível em breve</p>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        onClick={() => setPlaying(true)}
        className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-lg group"
      >
        {/* Thumbnail */}
        {videoType === "youtube" && getYouTubeId(videoUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://img.youtube.com/vi/${getYouTubeId(videoUrl)}/maxresdefault.jpg`}
            alt="Thumbnail"
            className="w-full h-full object-cover"
          />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-iw-navy fill-iw-navy ml-1" />
          </div>
        </div>
      </button>
    );
  }

  if (videoType === "youtube") {
    return (
      <YouTubePlayer
        url={videoUrl}
        onCompleted={onCompleted}
        trackProgress={trackProgress}
      />
    );
  }

  return (
    <DirectPlayer
      url={videoUrl}
      onCompleted={onCompleted}
      trackProgress={trackProgress}
    />
  );
}

