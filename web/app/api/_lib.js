import { neon } from '@neondatabase/serverless';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  return neon(process.env.DATABASE_URL);
}
export async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS guest_applications (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    topic VARCHAR(180) NOT NULL,
    availability TEXT NOT NULL,
    links TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    decision_explanation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}
function signature(value) { return createHmac('sha256', process.env.SESSION_SECRET || '').update(value).digest('hex'); }
export function validSession(request) {
  if (!process.env.SESSION_SECRET) return false;
  const raw = request.cookies.get('rtb_staff')?.value || '';
  const [expires, supplied] = raw.split('.');
  if (!expires || !supplied || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
}
export function sessionValue() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expires}.${signature(expires)}`;
}
export async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: false, reason: 'Email provider is not configured.' };
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }) });
  if (!response.ok) { console.error('Resend email failed:', response.status, await response.text()); return { sent: false, reason: 'Email provider rejected the request.' }; }
  return { sent: true };
}
export async function notifyDiscord(content) {
  if (!process.env.DISCORD_WEBHOOK_URL) return;
  const response = await fetch(process.env.DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: content.slice(0,1900), allowed_mentions: { parse: [] } }) });
  if (!response.ok) console.error('Discord notification failed:', response.status);
}
