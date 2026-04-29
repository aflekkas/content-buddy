import { listVideos } from "@/lib/db/queries";
import { VideoQueue } from "@/components/cockpit/video-queue";
import { FadeIn } from "@/components/ui/motion";

type Props = {
  userId: string;
};

export async function VideoQueueLoader({ userId }: Props) {
  const videos = await listVideos(userId);

  return (
    <FadeIn y={0} delay={0.08} className="h-full">
      <VideoQueue videos={videos} />
    </FadeIn>
  );
}
