import { NextResponse } from 'next/server';
import { db, ensureSchema, notifyDiscord, sendEmail, validSession } from '../../_lib';
export const runtime = 'nodejs';
const allowed = new Set(['submitted','under_review','accepted','denied','more_information','on_hold']);
const labels = { submitted:'Submitted', under_review:'Under review', accepted:'Accepted', denied:'Denied', more_information:'More information requested', on_hold:'On hold' };
export async function PATCH(request, context) {
  if (!validSession(request)) return NextResponse.json({error:'Staff sign-in required.'},{status:401});
  try {
    const { id } = await context.params; if (!/^\d+$/.test(String(id))) return NextResponse.json({error:'Invalid application reference.'},{status:400});
    const body=await request.json(), status=String(body.status||''), explanation=String(body.decisionExplanation||'').trim();
    if(!allowed.has(status)||explanation.length>3000) return NextResponse.json({error:'Choose a valid status and keep the explanation under 3,000 characters.'},{status:400});
    const sql=db(); await ensureSchema(sql);
    const rows=await sql`UPDATE guest_applications SET status=${status}, decision_explanation=${explanation}, updated_at=NOW() WHERE id=${Number(id)} RETURNING *`;
    if(!rows.length) return NextResponse.json({error:'Application not found.'},{status:404});
    const a=rows[0];
    const explanationText=explanation || 'The review team has updated your application status. Please contact the team if you need more details.';
    const emailText=`Hi ${a.name},\n\nThere is an update to your Real Talk with Brandon guest application.\n\nReference: ${a.id}\nStatus: ${labels[status]}\n\nMessage from the review team:\n${explanationText}\n\nReal Talk with Brandon`;
    await Promise.allSettled([sendEmail({to:a.email,subject:`Guest application update: ${labels[status]} (Ref ${a.id})`,text:emailText}),notifyDiscord(`🔔 **Guest application updated**\n**Reference:** ${a.id}\n**Applicant:** ${a.name}\n**Status:** ${labels[status]}\n**Explanation:** ${explanationText}`)]);
    return NextResponse.json({application:a});
  } catch(error) { console.error('Application update failed:',error); return NextResponse.json({error:'Could not update application. Check database setup.'},{status:500}); }
}
