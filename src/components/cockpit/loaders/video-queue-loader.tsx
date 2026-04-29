import { listVideos } from "@/lib/db/queries";
import { VideoQueue } from "@/components/cockpit/video-queue";

type Props = {
  userId: string;
};

export async function VideoQueueLoader({ userId }: Props) {
  const videos = await listVideos(userId);

  return <VideoQueue videos={videos} />;
}
