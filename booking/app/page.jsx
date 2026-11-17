const GUEST_PORTAL = process.env.NEXT_PUBLIC_GUEST_PORTAL_URL || 'https://real-talk-with-brandon-guest-portal.vercel.app';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'Therealpodcastnetwork@gmail.com';

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="nav">
        <a className="wordmark" href="/">REAL TALK <span>•</span> BRANDON</a>
        <a className="nav-link" href={GUEST_PORTAL}>Guest portal ↗</a>
      </nav>

      <section className="hero">
        <p className="eyebrow">REAL CONVERSATIONS · REAL EXPERIENCES · REAL STORIES</p>
        <h1>Every person has a story.<br /><em>Every story deserves a conversation.</em></h1>
        <p className="lead">Welcome to Real Talk with Brandon, hosted by Brandon D. Coleman Jr. A place for open, genuine conversations with people from all walks of life.</p>
        <div className="actions">
          <a className="primary" href={GUEST_PORTAL}>Apply to be a guest <span>→</span></a>
          <a className="secondary" href={`mailto:${CONTACT_EMAIL}`}>Contact the show</a>
        </div>
        <p className="note">You do not need to be famous, have a large following, or own a business. If you have a story or perspective to share, we want to hear from you.</p>
      </section>

      <section className="details">
        <article>
          <p className="eyebrow">THE CONVERSATION</p>
          <h2>Bring your story.<br /><em>We'll bring the questions.</em></h2>
          <p>Talk about your journey, creative work, music, gaming, books, business, community, history, current events, challenges, achievements, or the topics that matter to you.</p>
        </article>
        <div className="facts">
          <div><span>INTERVIEW LENGTH</span><strong>Approximately 60 minutes</strong></div>
          <div><span>FORMAT</span><strong>Online video interview</strong></div>
          <div><span>PLATFORM</span><strong>Google Meet</strong></div>
          <div><span>HOST</span><strong>Brandon D. Coleman Jr.</strong></div>
        </div>
      </section>

      <section className="steps">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2>From application to conversation.</h2>
        <div className="step-grid">
          <div><b>01</b><h3>Apply</h3><p>Tell us about yourself and what you would like to discuss through the guest portal.</p></div>
          <div><b>02</b><h3>Review</h3><p>The show team reviews your request and contacts you with an update by email.</p></div>
          <div><b>03</b><h3>Book</h3><p>Approved guests receive the interview scheduling link and choose an available time.</p></div>
          <div><b>04</b><h3>Talk</h3><p>Join your Google Meet interview and have a real conversation with Brandon.</p></div>
        </div>
        <a className="primary" href={GUEST_PORTAL}>Start your guest application <span>→</span></a>
      </section>

      <footer>
        <div><strong>REAL TALK WITH BRANDON</strong><span>Every story deserves a conversation.</span></div>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </main>
  );
}
