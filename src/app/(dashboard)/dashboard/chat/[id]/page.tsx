import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getCachedMessages,
  getChat,
  getUserProfile,
} from "@/lib/db/queries";
import { toUIMessages } from "@/lib/chat-messages";
import { Chat } from "@/components/chat/chat";
import { checkDailyAiTokenBudget } from "@/lib/ai-usage";
import {
  defaultModel,
  isModelForProvider,
  isProviderId,
} from "@/lib/providers";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChatThreadPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { id } = await params;

  const [chat, profile, dailyBudget] = await Promise.all([
    getChat(id, user.id),
    getUserProfile(user.id),
    checkDailyAiTokenBudget(user.id),
  ]);
  if (!chat) notFound();

  const page = await getCachedMessages(chat.id, { limit: 50 });

  const hasActiveKey = Boolean(process.env.OPENAI_API_KEY);

  const providerId =
    profile && isProviderId(profile.active_provider_id)
      ? profile.active_provider_id
      : ("openai" as const);
  const modelId =
    profile && isModelForProvider(providerId, profile.active_model_id)
      ? profile.active_model_id
      : defaultModel(providerId);

  return (
    <Chat
      chatId={chat.id}
      initialMessages={toUIMessages(page.messages)}
      initialHasMore={page.hasMore}
      initialUsage={{
        inputTokens: chat.input_tokens,
        outputTokens: chat.output_tokens,
        cacheReadTokens: chat.cache_read_tokens,
        cacheCreationTokens: chat.cache_creation_tokens,
      }}
      initialDailyBudget={dailyBudget}
      hasActiveKey={hasActiveKey}
      activeProviderId={providerId}
      activeModelId={modelId}
    />
  );
}
