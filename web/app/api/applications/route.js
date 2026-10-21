import { NextResponse } from 'next/server';
import { db, ensureSchema, notifyDiscord, sendEmail, validSession } from '../_lib';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim(), email = String(body.email || '').trim(), topic = String(body.topic || '').trim(), availability = String(body.availability || '').trim(), links = String(body.links || '').trim(), details = String(body.details || '').trim();
    if (!name || name.length > 120 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !topic || topic.length > 180 || !availability || availability.length > 1500 || links.length > 1000 || details.length > 4000) return NextResponse.json({ error: 'Please complete the required fields and check the length of your answers.' }, { status: 400 });
    const sql = db(); await ensureSchema(sql);
    const rows = await sql`INSERT INTO guest_applications (name,email,topic,availability,links,details) VALUES (${name},${email},${topic},${availability},${links},${details}) RETURNING id,created_at`;
    const id = String(rows[0].id);
    const discordText = `📬 **New Real Talk with Brandon guest application**\n**Reference:** ${id}\n**Name:** ${name}\n**Email:** ${email}\n**Topic:** ${topic}\n**Availability:** ${availability}${links ? `\n**Links:** ${links}` : ''}${details ? `\n**Details:** ${details}` : ''}\nReview in the staff dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || ''}/staff`;
    await Promise.allSettled([notifyDiscord(discordText), sendEmail({ to: email, subject: `We received your guest application (Ref ${id})`, text: `Hi ${name},\n\nThanks for applying to be a guest on Real Talk with Brandon. We have received your application and our team will review it.\n\nReference number: ${id}\nStatus: Submitted\n\nWe will email you if there is an update.\n\nReal Talk with Brandon` })]);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) { console.error('Application submission failed:', error); return NextResponse.json({ error: 'The application could not be saved. Please try again later.' }, { status: 500 }); }
}

export async function GET(request) {
  if (!validSession(request)) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  try { const sql=db(); await ensureSchema(sql); const applications=await sql`SELECT * FROM guest_applications ORDER BY created_at DESC LIMIT 500`; return NextResponse.json({ applications }); }
  catch(error) { console.error('Application list failed:',error); return NextResponse.json({error:'Could not load applications. Check database setup.'},{status:500}); }
}
