import { useState } from "react";

const initialHabits = ["Morning movement", "Deep work block", "Evening review"];

export function Tracker() {
  const [completed, setCompleted] = useState<boolean[]>([false, false, false]);
  const done = completed.filter(Boolean).length;

  function toggle(index: number) {
    setCompleted((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  }

  return (
    <section className="route-view" aria-labelledby="tracker-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY TRACKER / TUESDAY, OCTOBER 14</p>
          <h1 id="tracker-title">Keep the chain alive.</h1>
          <p className="lede">Mark what happened. The rest of the journey follows from there.</p>
        </div>
        <span className="completion-count"><strong>{done}</strong> / {initialHabits.length} complete</span>
      </div>
      <div className="tracker-layout">
        <article className="panel tracker-panel">
          <div className="panel-heading"><span>Tuesday, October 14</span><span className="badge">DAY 01</span></div>
          <div className="habit-list">
            {initialHabits.map((habit, index) => (
              <button className={`habit-row ${completed[index] ? "complete" : ""}`} key={habit} type="button" onClick={() => toggle(index)} aria-pressed={completed[index]}>
                <span className="check" aria-hidden="true">{completed[index] ? "OK" : "--"}</span>
                <span className="habit-name">{habit}</span>
                <span className="habit-frequency">daily</span>
              </button>
            ))}
          </div>
          <div className="tracker-actions">
            <button className="button button-primary" type="button" onClick={() => setCompleted([true, true, true])}>Mark all complete</button>
            <button className="button button-ghost" type="button" onClick={() => setCompleted([false, false, false])}>Reset day</button>
          </div>
        </article>
        <aside className="panel note-panel">
          <div className="panel-heading"><span>Daily note</span><span className="muted">optional</span></div>
          <label htmlFor="daily-note">What did you learn today?</label>
          <textarea id="daily-note" rows={7} placeholder="Write a plain-text note..." />
          <p className="sync-copy"><span className="status-dot" aria-hidden="true" />Saved locally. Sync will appear when an account is connected.</p>
        </aside>
      </div>
    </section>
  );
}
