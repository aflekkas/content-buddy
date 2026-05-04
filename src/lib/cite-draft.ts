import type { PostType } from "@/lib/db/types";

export type CiteDraftDetail = {
  id: string;
  body: string;
  post_type: PostType | null;
  updated_at: string | null;
};

export function citeDraft(detail: CiteDraftDetail) {
  window.dispatchEvent(
    new CustomEvent<CiteDraftDetail>("chat:cite-draft", { detail }),
  );
}
