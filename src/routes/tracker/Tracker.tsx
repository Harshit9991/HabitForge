import type { useHabitState } from "../../components/habits/useHabitState";
import { SyncStatus } from "../../components/sync-status/SyncStatus";

type HabitState = ReturnType<typeof useHabitState>;

export function Tracker({ state }: { state: HabitState }) {
  const done = state.completedCount;

  return (
    <section className="route-view" aria-labelledby="tracker-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DAILY TRACKER / TUESDAY, OCTOBER 14</p>
          <h1 id="tracker-title">Keep the chain alive.</h1>
          <p className="lede">Mark what happened. The rest of the journey follows from there.</p>
        </div>
        <span className="completion-count" aria-label={`${done} of ${state.habits.length} complete`}><strong>{done}</strong> / {state.habits.length} complete</span>
      </div>
      <div className="tracker-layout">
        <article className="panel tracker-panel">
          <div className="panel-heading">
            <button className="date-button" type="button" onClick={() => state.moveDate(-1)} aria-label="Previous date" disabled={state.selectedDate === state.journey.startDate}>&lt;</button>
            <span>{state.selectedDate}</span>
            <button className="date-button" type="button" onClick={() => state.moveDate(1)} aria-label="Next date" disabled={state.dayNumber === state.journeyLength}>&gt;</button>
            <span className="badge">DAY 01</span>
          </div>
          <div className="habit-list">
            {state.habits.map((habit) => {
              const isComplete = state.completed[`${state.selectedDate}:${habit.id}`] ?? false;
              return <button className={`habit-row ${isComplete ? "complete" : ""}`} key={habit.id} type="button" onClick={() => state.toggleHabit(habit.id)} aria-pressed={isComplete}>
                <span className="check" aria-hidden="true">{isComplete ? "OK" : "--"}</span>
                <span className="habit-name">{habit.label}</span>
                <span className="habit-frequency">{habit.frequency}</span>
              </button>
            })}
          </div>
          <div className="tracker-actions">
            <button className="button button-primary" type="button" onClick={state.markAll}>Mark all complete</button>
            <button className="button button-ghost" type="button" onClick={state.reset}>Reset day</button>
          </div>
        </article>
        <aside className="panel note-panel">
          <div className="panel-heading"><span>Daily note</span><span className="muted">optional</span></div>
          <label htmlFor="daily-note">What did you learn today?</label>
          <textarea id="daily-note" rows={7} placeholder="Write a plain-text note..." value={state.note} onChange={(event) => state.setNote(event.target.value)} />
          <SyncStatus state={state.syncState} />
        </aside>
      </div>
    </section>
  );
}
