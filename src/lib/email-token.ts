import { randomBytes } from "crypto";

export function newEmailToken(): string {
  return randomBytes(18).toString("hex");
}
