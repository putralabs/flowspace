import { QueryClient } from "@tanstack/react-query";

/** Shared client so non-component code (e.g. auth store) can clear cached data on account switch. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});
