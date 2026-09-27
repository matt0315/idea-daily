import { Inngest } from "inngest";
import { brand } from "@/lib/brand";

export const inngest = new Inngest({ id: brand.name.toLowerCase() });
