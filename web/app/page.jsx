'use client';
import { useState } from 'react';

export default function Home() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', availability: '', links: '', details: '' });
  const [state, setState] = useState({ busy: false, message: '', error: false });
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function submit(e) {
    e.preventDefault(); setState({ busy: true, message: '', error: false });
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit your application.');
      setForm({ name: '', email: '', topic: '', availability: '', links: '', details: '' });
      setState({ busy: false, message: `Application submitted! Your reference number is ${data.id}.`, error: false });
    } catch (err) { setState({ busy: false, message: err.message || 'Something went wrong.', error: true }); }
  }
  return <main className="shell"><nav className="top"><span className="brand">RTB<span>•</span></span><a href="/staff">Staff sign in ↗</a></nav><section className="hero"><p className="eyebrow">YOUR VOICE. YOUR STORY.</p><h1>Come talk<br/><em>with Brandon.</em></h1><p className="intro">Have a story, perspective, or experience worth sharing? Apply to be a guest on Real Talk with Brandon.</p></section><section className="panel"><div className="panel-head"><div><p className="eyebrow">GUEST APPLICATION</p><h2>Tell us about yourself</h2></div><span className="step">01 / APPLY</span></div><form onSubmit={submit} className="form"><label>Full name<input name="name" autoComplete="name" value={form.name} onChange={change} required maxLength={120} placeholder="Your name"/></label><label>Email address<input name="email" type="email" autoComplete="email" value={form.email} onChange={change} required maxLength={254} placeholder="you@example.com"/></label><label>What would you like to talk about?<input name="topic" value={form.topic} onChange={change} required maxLength={180} placeholder="Your story or topic"/></label><label>Availability<textarea name="availability" value={form.availability} onChange={change} required maxLength={1500} rows={3} placeholder="Days, times, and time zone"/></label><label>Social links or website <span className="optional">(optional)</span><input name="links" value={form.links} onChange={change} maxLength={1000} placeholder="Links we can review"/></label><label>Anything else we should know? <span className="optional">(optional)</span><textarea name="details" value={form.details} onChange={change} maxLength={4000} rows={4} placeholder="A little more about your experience or idea"/></label><button disabled={state.busy}>{state.busy ? 'Submitting…' : 'Submit application'} <span>→</span></button>{state.message && <p role="status" className={state.error ? 'notice error' : 'notice'}>{state.message}</p>}<p className="privacy">Your details are shared with the Real Talk with Brandon review team so they can consider your application and contact you about its status.</p></form></section><footer><span>REAL TALK WITH BRANDON</span><span>Good conversations start here.</span></footer></main>;
}
