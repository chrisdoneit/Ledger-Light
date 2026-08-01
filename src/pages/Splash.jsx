import { Link } from 'react-router-dom'

export default function Splash() {
  return (
    <div className="splash-bg">
      <nav className="splash-nav">
        <div className="splash-logo">Ledger <span>&</span> Light</div>
        <div className="splash-nav-links">
          <Link className="splash-link" to="/login">Log in</Link>
          <Link className="splash-btn" to="/signup">Get started</Link>
        </div>
      </nav>

      <div className="splash-hero">
        <h1>Trade discipline<br /><span>&</span> life direction,<br />in one place.</h1>
        <p>
          A trading journal that tracks your P&amp;L, win rate, and setups — next to a
          daily journal for the goals and moments that matter outside the market.
        </p>
        <Link className="splash-btn" to="/signup">Get started — it's free</Link>
      </div>

      <div className="splash-features">
        <div className="splash-feature">
          <h3>Trade log &amp; stats</h3>
          <p>Log every trade with entry, exit, size, and a screenshot. P&amp;L, win rate, and profit factor calculate automatically.</p>
        </div>
        <div className="splash-feature">
          <h3>Calendar heatmap</h3>
          <p>See your month at a glance, colored by daily P&amp;L, with your running account balance at the end of every week.</p>
        </div>
        <div className="splash-feature">
          <h3>Daily journal</h3>
          <p>Set the one thing that matters most today, track your goals, and write freely — a running record of your days.</p>
        </div>
      </div>

      <div className="splash-ticker">
        <span>BUILT FOR TRADERS WHO JOURNAL</span>
        <span>WIN RATE · PROFIT FACTOR · P&amp;L</span>
        <span>FREE TO START</span>
      </div>
    </div>
  )
}
