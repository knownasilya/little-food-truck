import type { UserRole } from "@little-food-truck/shared";
import { Hono } from "hono";

export type Variables = {
  userId: string | null;
  role: UserRole | null;
};

export type AppEnv = { Variables: Variables };

export function createApp() {
  return new Hono<AppEnv>();
}
