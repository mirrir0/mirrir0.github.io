/**
 * Module-scope holder for the ext-apps App instance so non-React code
 * (blog-client, router intent handlers) can reach it without threading it
 * through React context. Set once during MCP bootstrap; undefined in the
 * standalone/ano contexts.
 */
import type { App } from "@modelcontextprotocol/ext-apps";

let app: App | undefined;
let resolveReady: (a: App) => void;
const ready = new Promise<App>((r) => {
  resolveReady = r;
});

export const getApp = (): App | undefined => app;

export const setApp = (a: App): void => {
  app = a;
  resolveReady(a);
};

/** Resolves once bootstrap has connected the App (MCP mode). blog-client awaits
 *  this so an early lifecycle call doesn't race the async connect. */
export const requireApp = (): Promise<App> => app ? Promise.resolve(app) : ready;
