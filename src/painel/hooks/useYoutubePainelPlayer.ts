import { useCallback, useEffect, useRef } from "react";

const YT_SCRIPT_SRC = "https://www.youtube.com/iframe_api";

type YTPlayer = {
  pauseVideo(): void;
  playVideo(): void;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
  mute(): void;
};

type YTNamespace = {
  Player: new (elementId: string, options: unknown) => YTPlayer;
};

function getYT(): YTNamespace | undefined {
  return (typeof window !== "undefined" ? (window as unknown as { YT?: YTNamespace }).YT : undefined);
}

/**
 * Carrega a IFrame API do YouTube e instancia um player de playlist (muted para autoplay).
 */
export function useYoutubePainelPlayer(playlistId: string | null, elementId: string) {
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (!playlistId) return;

    const initPlayer = () => {
      const YT = getYT();
      if (!YT?.Player || playerRef.current) return;

      const el = document.getElementById(elementId);
      if (!el) return;

      const playerOptions = {
        height: "100%",
        width: "100%",
        playerVars: {
          listType: "playlist",
          list: playlistId,
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            try {
              e.target.mute();
            } catch {
              /* ignore */
            }
          },
        },
      };
      playerRef.current = new YT.Player(elementId, playerOptions as unknown);
    };

    const w = window as Window & { onYouTubeIframeAPIReady?: () => void };

    if (getYT()?.Player) {
      queueMicrotask(initPlayer);
      return () => {
        try {
          playerRef.current?.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      };
    }

    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      initPlayer();
    };

    if (!document.querySelector(`script[src="${YT_SCRIPT_SRC}"]`)) {
      const tag = document.createElement("script");
      tag.src = YT_SCRIPT_SRC;
      document.head.appendChild(tag);
    }

    return () => {
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [playlistId, elementId]);

  const pauseAndGetTime = useCallback((): number => {
    const p = playerRef.current;
    if (!p) return 0;
    try {
      p.pauseVideo();
      return p.getCurrentTime();
    } catch {
      return 0;
    }
  }, []);

  const resumeAt = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.seekTo(seconds, true);
      p.playVideo();
    } catch {
      /* ignore */
    }
  }, []);

  return { pauseAndGetTime, resumeAt };
}
