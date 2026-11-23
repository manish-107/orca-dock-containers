// The panel <-> worker contract. Each feature declares its own requests and events in
// src/features/<feature>/types.ts; this file holds only the ones that belong to no feature.
export {}

declare module 'orca' {
  interface PluginRequests {
    /**
     * Whether Docker answers. The panel calls it when it opens and every few minutes while open,
     * which also keeps the worker (and its event stream) alive. Orca stops an idle worker after
     * about 5 minutes, so a closed panel costs nothing.
     */
    'docker.ping': { output: { reachable: boolean; error?: string } }
  }
}
