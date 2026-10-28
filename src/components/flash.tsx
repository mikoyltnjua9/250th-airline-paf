import { cookies } from "next/headers";
import { FLASH_COOKIE } from "@/lib/flash";
import { FlashToast } from "@/components/flash-toast";

/** Hands the message `flash()` queued, if any, to the toast. Mounted in each signed-in layout. */
export async function Flash() {
  const jar = await cookies();
  const value = jar.get(FLASH_COOKIE)?.value;
  return <FlashToast value={value} />;
}
