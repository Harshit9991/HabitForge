import type { useHabitState } from "../../components/habits/useHabitState";

type HabitState = ReturnType<typeof useHabitState>;

export function Dashboard({ state }: { state: HabitState }) {
  return (
    <section className="route-view" aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THREE MONTH JOURNEY / DAY 01</p>
          <h1 id="dashboard-title">Build your edge.</h1>
          <p className="lede">A clear view of the small actions that compound into something stronger.</p>
        </div>
        <button className="button button-primary" type="button">+ Add habit</button>
      </div>
      <div className="dashboard-grid">
        <article className="panel progress-panel">
          <div className="panel-heading"><span>Journey progress</span><span className="mono">01 / 90</span></div>
          <div className="progress-ring" aria-label="Journey progress 1 percent"><strong>1%</strong><span>forged</span></div>
          <div className="metric-row"><span>Current streak</span><strong>1 day</strong></div>
          <div className="metric-row"><span>Best streak</span><strong>1 day</strong></div>
        </article>
        <article className="panel today-panel">
          <div className="panel-heading"><span>Today</span><span className="badge">LOCAL</span></div>
          <p className="today-date">Tuesday, October 14</p>
          <p className="today-subtitle">One deliberate action is enough to keep the chain alive.</p>
          <a className="button button-secondary" href="/tracker">Open daily tracker <span aria-hidden="true">-&gt;</span></a>
        </article>
        <article className="panel overview-panel">
          <div className="panel-heading"><span>Habit overview</span><span className="mono">{state.completedCount} / {state.habits.length}</span></div>
          <div className="overview-bar"><span style={{ width: `${(state.completedCount / state.habits.length) * 100}%` }} /></div>
          {state.habits.map((habit, index) => <div className="habit-preview" key={habit.id}><span className="habit-icon">{String(index + 1).padStart(2, "0")}</span><span>{habit.label}</span><span className="muted">{habit.frequency}</span></div>)}
        </article>
      </div>
    </section>
  );
}
