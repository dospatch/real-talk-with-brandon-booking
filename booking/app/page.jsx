const GUEST_PORTAL = '/apply';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'Therealpodcastnetwork@gmail.com';
const DISCORD_INVITE = 'https://discord.gg/BaktNA8mwv';

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="nav">
        <a className="wordmark" href="/">REAL TALK <span>•</span> BRANDON</a>
        <div className="nav-actions">
          <a className="nav-link" href="/apply">Guest application ↗</a>
          <a className="nav-link" href={DISCORD_INVITE} target="_blank" rel="noreferrer">Discord ↗</a>
        </div>
      </nav>
      <section className="hero">
        <p className="eyebrow">REAL CONVERSATIONS · REAL EXPERIENCES · REAL STORIES</p>
        <h1>Every person has a story.<br /><em>Every story deserves a conversation.</em></h1>
        <p className="lead">Welcome to Real Talk with Brandon, hosted by Brandon D. Coleman Jr. A place for open, genuine conversations with people from all walks of life.</p>
        <div className="actions">
          <a className="primary" href={GUEST_PORTAL}>Apply to be a guest <span>→</span></a>
          <a className="secondary" href={'mailto:' + CONTACT_EMAIL}>Contact the show</a>
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
          <div><b>01</b><h3>Apply</h3><p>Complete the guest application right here on this website.</p></div>
          <div><b>02</b><h3>Review</h3><p>Your application starts as Pending Review. We send confirmation and status updates to your email.</p></div>
          <div><b>03</b><h3>Book</h3><p>Approved guests receive the interview scheduling link and choose an available time.</p></div>
          <div><b>04</b><h3>Talk</h3><p>Join your Google Meet interview and have a real conversation with Brandon.</p></div>
        </div>
        <div className="actions">
          <a className="primary" href={GUEST_PORTAL}>Start your guest application <span>→</span></a>
          <a className="secondary" href={DISCORD_INVITE} target="_blank" rel="noreferrer">Join our Discord community ↗</a>
        </div>
      </section>
      <footer>
        <div><strong>REAL TALK WITH BRANDON</strong><span>Every story deserves a conversation.</span></div>
        <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a>
      </footer>
    </main>
  );
}
