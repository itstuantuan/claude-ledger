import { Suspense } from "react";
import { WorkersPage } from "@/features/customers/list-pages";
import { LoadingState } from "@/components/common/error-state";
export const metadata = { title: "油漆工" };
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <WorkersPage />
    </Suspense>
  );
}
 