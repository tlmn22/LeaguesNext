import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type FlashType = 'success' | 'danger' | 'warning' | 'info';
export const FLASH_COOKIE = 'lm_flash';

/** Дараагийн хуудсанд нэг удаа харагдах мэдэгдэл (client-ийн <Flash/> уншиж устгана) */
export async function setFlash(type: FlashType, message: string): Promise<void> {
  const jar = await cookies();
  jar.set(FLASH_COOKIE, encodeURIComponent(JSON.stringify({ type, message })), {
    path: '/',
    maxAge: 60,
    sameSite: 'lax',
    httpOnly: false,
  });
}

/** Flash тавиад redirect хийнэ (PHP-ийн set_flash + redirect) */
export async function flashRedirect(type: FlashType, message: string, url: string): Promise<never> {
  await setFlash(type, message);
  redirect(url);
}
