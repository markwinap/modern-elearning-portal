import "server-only";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";
import type React from "react";
import { cache } from "react";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

export const getQueryClient = cache(createQueryClient);
export const api = createCaller(createContext);

export function HydrateClient({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const state = dehydrate(queryClient);
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
