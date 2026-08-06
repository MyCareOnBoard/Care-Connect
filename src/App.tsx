import { Suspense } from "react";
import { router } from "./routes";
import { RouterProvider } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/ui/loader";
import { MapsProvider } from "@/components/maps/MapsProvider";

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader text="Loading application..." />}>
        <MapsProvider>
          <RouterProvider router={router} />
        </MapsProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
