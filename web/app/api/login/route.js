import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sessionValue } from '../_lib';
export const runtime='nodejs';
export async function POST(request) {
  try {
    if(!process.env.ADMIN_PASSWORD||!process.env.SESSION_SECRET) return NextResponse.json({error:'Staff sign-in is not configured yet.'},{status:503});
    const body=await request.json(), supplied=Buffer.from(String(body.password||'')), expected=Buffer.from(process.env.ADMIN_PASSWORD);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)) return NextResponse.json({error:'Incorrect password.'},{status:401});
    const response=NextResponse.json({ok:true}); response.cookies.set('rtb_staff',sessionValue(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*60*60}); return response;
  } catch { return NextResponse.json({error:'Could not sign in.'},{status:400}); }
}
