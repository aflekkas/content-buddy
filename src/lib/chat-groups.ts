import type { ChatRow } from "./db/types";

export type ChatGroup = { name: string; chats: ChatRow[] };

export function groupChatsByDate(chats: ChatRow[]): ChatGroup[] {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = today - 30 * 24 * 60 * 60 * 1000;
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

  const todayChats: ChatRow[] = [];
  const last7: ChatRow[] = [];
  const last30: ChatRow[] = [];
  const thisYear: ChatRow[] = [];
  const older: Record<number, ChatRow[]> = {};

  for (const chat of chats) {
    const ts = chat.updated_at ? new Date(chat.updated_at).getTime() : today;

    if (ts >= today) todayChats.push(chat);
    else if (ts >= weekAgo) last7.push(chat);
    else if (ts >= monthAgo) last30.push(chat);
    else if (ts >= yearStart) thisYear.push(chat);
    else {
      const year = new Date(ts).getFullYear();
      (older[year] ??= []).push(chat);
    }
  }

  const result: ChatGroup[] = [];
  if (todayChats.length) result.push({ name: "Today", chats: todayChats });
  if (last7.length) result.push({ name: "Last 7 days", chats: last7 });
  if (last30.length) result.push({ name: "Last 30 days", chats: last30 });
  if (thisYear.length) result.push({ name: "This year", chats: thisYear });

  Object.entries(older)
    .sort(([a], [b]) => Number(b) - Number(a))
    .forEach(([year, yearChats]) => result.push({ name: year, chats: yearChats }));

  return result;
}
