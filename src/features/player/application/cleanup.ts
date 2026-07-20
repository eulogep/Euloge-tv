import type { HlsAdapter } from "../infrastructure/hls-adapter";

export type CleanupPlaybackResourcesInput = {
  video: HTMLVideoElement | null;
  adapter: HlsAdapter | null;
  blobUrls: Set<string>;
  revokeObjectUrl?: (url: string) => void;
};

export const cleanupPlaybackResources = ({
  video,
  adapter,
  blobUrls,
  revokeObjectUrl = URL.revokeObjectURL,
}: CleanupPlaybackResourcesInput): void => {
  adapter?.destroy();
  if (video) {
    video.removeAttribute("src");
    video.load();
  }
  blobUrls.forEach((url) => revokeObjectUrl(url));
  blobUrls.clear();
};
