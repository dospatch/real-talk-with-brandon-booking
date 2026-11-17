'use client';
import { useState } from 'react';

const initialForm = { name: '', introName: '', email: '', about: '', topic: '', avoidTopics: '', availability: '', links: '', details: '' };

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ busy: false, message: '', error: false });
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function submit(e) {
    e.preventDefault(); setState({ busy: true, message: '', error: false });
    try {
      const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit your application.');
      setForm(initialForm);
      setState({ busy: false, message: `Application submitted! Your reference number is ${data.id}.`, error: false });
    } catch (err) { setState({ busy: false, message: err.message || 'Something went wrong.', error: true }); }
  }
  return <main className="shell">
    <nav className="top"><span className="brand">RTB<span>•</span></span><a href="https://real-talk-with-brandon-booking.vercel.app/">About the show ↗</a></nav>
    <section className="hero">
      <p className="eyebrow">YOUR VOICE. YOUR STORY.</p>
      <h1>Welcome to<br/><em>Real Talk with Brandon.</em></h1>
      <p className="intro"><strong>Every person has a story. Every story deserves a conversation.</strong></p>
      <p className="intro">Hosted by Brandon D. Coleman Jr., Real Talk with Brandon welcomes people from all walks of life. You do not have to be famous, have a large following, own a business, or be a content creator. If you have a story, experience, perspective, passion, or something meaningful to share, there is a place for you here.</p>
      <p className="intro">Conversations may cover personal journeys, YouTube, gaming, streaming, AI music, entertainment, books, creativity, business, careers, history, politics, current events, social issues, challenges, achievements, projects, and future plans.</p>
      <p className="intro">This is about getting to know the person behind the story—not just promoting a channel or project.</p>
    </section>
    <section className="panel">
      <div className="panel-head"><div><p className="eyebrow">GUEST APPLICATION</p><h2>Tell us about yourself</h2></div><span className="step">01 / APPLY</span></div>
      <form onSubmit={submit} className="form">
        <label>Full name<input name="name" autoComplete="name" value={form.name} onChange={change} required maxLength={120} placeholder="Your full name"/></label>
        <label>What name would you like me to use when introducing you? <span className="optional">(optional)</span><input name="introName" value={form.introName} onChange={change} maxLength={120} placeholder="Your preferred introduction name"/></label>
        <label>Email address<input name="email" type="email" autoComplete="email" value={form.email} onChange={change} required maxLength={254} placeholder="you@example.com"/></label>
        <label>Tell us a little about yourself or your work<textarea name="about" value={form.about} onChange={change} required maxLength={3000} rows={4} placeholder="Your background, work, interests, or personal journey"/></label>
        <label>What is your story, background, or area of interest? <span className="optional">(optional)</span><textarea name="topic" value={form.topic} onChange={change} required maxLength={1800} rows={3} placeholder="What would you like listeners to learn about you?"/></label>
        <label>What would you like us to discuss? <span className="optional">(optional)</span><textarea name="topic" value={form.topic} onChange={change} maxLength={1800} rows={3} placeholder="Topics, experiences, projects, or ideas"/></label>
        <label>Are there any subjects you would prefer not to discuss? <span className="optional">(optional)</span><textarea name="avoidTopics" value={form.avoidTopics} onChange={change} maxLength={1500} rows={2} placeholder="You can leave this blank if there are none"/></label>
        <label>Availability<textarea name="availability" value={form.availability} onChange={change} required maxLength={1500} rows={3} placeholder="Days, times, and time zone"/></label>
        <label>Website, YouTube, social media, or project links <span className="optional">(optional)</span><input name="links" value={form.links} onChange={change} maxLength={1000} placeholder="Links we can review"/></label>
        <label>Anything special you would like listeners to know? <span className="optional">(optional)</span><textarea name="details" value={form.details} onChange={change} maxLength={3000} rows={3} placeholder="Anything else you want to share"/></label>
        <button disabled={state.busy}>{state.busy ? 'Submitting…' : 'Submit application'} <span>→</span></button>
        {state.message && <p role="status" className={state.error ? 'notice error' : 'notice'}>{state.message}</p>}
        <p className="privacy">Your application is reviewed by the Real Talk with Brandon team. If accepted, you will receive an email with the interview booking link. Interviews are approximately 60 minutes and take place online through Google Meet. You may identify subjects you prefer not to discuss.</p>
      </form>
    </section>
    <footer><span>REAL TALK WITH BRANDON</span><span>Every story deserves a conversation.</span></footer>
  </main>;
}
