'use server';

export type ContactState = { sent: boolean; error: string; values: Record<string, string> };

export async function sendContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  const values = {
    name: String(fd.get('name') ?? '').trim(),
    email: String(fd.get('email') ?? '').trim(),
    subject: String(fd.get('subject') ?? '').trim(),
    message: String(fd.get('message') ?? '').trim(),
  };
  if (!values.name || !values.email || !values.message) return { sent: false, error: 'Бүх талбарыг бөглөнө үү.', values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return { sent: false, error: 'И-мэйл буруу байна.', values };

  // PHP хувилбар шиг одоогоор мессеж хадгалахгүй/илгээхгүй.
  // SMTP тохируулбал энд nodemailer гэх мэтээр info@leagues.mn руу илгээж болно.
  console.info('[contact]', values.subject, values.email);
  return { sent: true, error: '', values: {} };
}
