import { NextResponse } from 'next/server';
import { db, ensureSchema, notifyDiscord, sendEmail, validSession } from '../_lib';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const introName = String(body.introName || '').trim();
    const email = String(body.email || '').trim();
    const about = String(body.about || '').trim();
    const background = String(body.background || '').trim();
    const topic = String(body.topic || '').trim();
    const avoidTopics = String(body.avoidTopics || '').trim();
    const availability = String(body.availability || '').trim();
    const links = String(body.links || '').trim();
    const details = String(body.details || '').trim();
    if (!name || name.length > 120 || introName.length > 120 || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !about || about.length > 3000 || background.length > 1800 || !topic || topic.length > 1800 || avoidTopics.length > 1500 || !availability || availability.length > 1500 || links.length > 1000 || details.length > 3000) {
      return NextResponse.json({ error: 'Please complete the required fields and check the length of your answers.' }, { status: 400 });
    }
    const sql = db();
    await ensureSchema(sql);
    const rows = await sql`INSERT INTO guest_applications (name,email,intro_name,about,background,topic,avoid_topics,availability,links,details)
      VALUES (${name},${email},${introName},${about},${background},${topic},${avoidTopics},${availability},${links},${details}) RETURNING id,created_at`;
    const id = String(rows[0].id);
    const portal = process.env.NEXT_PUBLIC_SITE_URL || '';
    const discordText = `📬 **New Real Talk with Brandon guest application**\n**Reference:** ${id}\n**Name:** ${name}\n**Introduction name:** ${introName || 'Not specified'}\n**Email:** ${email}\n**About:** ${about}\n**Background/interests:** ${background || 'Not provided'}\n**Discussion topics:** ${topic}\n**Topics to avoid:** ${avoidTopics || 'None specified'}\n**Availability:** ${availability}${links ? `\n**Links:** ${links}` : ''}${details ? `\n**Listener message:** ${details}` : ''}\nReview in the staff dashboard: ${portal}/staff`;
    const applicantEmail = `Hi ${name},\n\nThanks for applying to be a guest on Real Talk with Brandon. We have received your application and our team will review it.\n\nReference number: ${id}\nStatus: Submitted\n\nWe will email you if there is an update.\n\nReal Talk with Brandon`;
    const adminEmail = `A new guest application was submitted.\n\nReference: ${id}\nName: ${name}\nIntroduction name: ${introName || 'Not specified'}\nGuest email: ${email}\nAbout: ${about}\nBackground/interests: ${background || 'Not provided'}\nDiscussion topics: ${topic}\nTopics to avoid: ${avoidTopics || 'None specified'}\nAvailability: ${availability}\nLinks: ${links || 'Not provided'}\nAdditional message: ${details || 'Not provided'}\n\nReview the application in the staff dashboard: ${portal}/staff`;
    await Promise.allSettled([
      notifyDiscord(discordText),
      sendEmail({ to: email, subject: `We received your guest application (Ref ${id})`, text: applicantEmail }),
      sendEmail({ to: process.env.ADMIN_EMAIL || 'Therealpodcastnetwork@gmail.com', subject: `New Real Talk with Brandon guest application — ${name} (Ref ${id})`, text: adminEmail })
    ]);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error('Application submission failed:', error);
    return NextResponse.json({ error: 'The application could not be saved. Please try again later.' }, { status: 500 });
  }
}

export async function GET(request) {
  if (!validSession(request)) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 401 });
  try {
    const sql = db();
    await ensureSchema(sql);
    const applications = await sql`SELECT * FROM guest_applications ORDER BY created_at DESC LIMIT 500`;
    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Application list failed:', error);
    return NextResponse.json({ error: 'Could not load applications. Check database setup.' }, { status: 500 });
  }
}
