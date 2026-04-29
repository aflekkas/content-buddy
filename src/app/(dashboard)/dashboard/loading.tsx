import { CircularLoader } from "@/components/ui/loader";

export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <CircularLoader size="md" />
    </div>
  );
}
