// Step-by-step playback with history, for algorithms that move in discrete steps.
//
//   const s = lab.stepper({
//     init: () => initialState,
//     step: (state, { instant }) => nextState,   // PURE: return a new state, never mutate
//     isDone: state => boolean,
//     render: (state, { running }) => redraw,
//     delay: state => 600,                        // ms per step at 1x speed
//   });
//
// Run / Pause, Next step and Previous step buttons are wired to this. Because `step`
// returns a new state each time, Previous step is just restoring the last state.
import { setupSpeed, setRunButton } from '../common.js';

export function createStepper(lab, { init, step, isDone = () => false, render, delay = () => 600, maxHistory = 5000, instantCap = 10000 }) {
  const btn = name => lab.root.querySelector(`[data-act="${name}"]`);
  let state = init(), history = [], timer = null, running = false;
  const playback = setupSpeed(lab.ref('speed'), lab.ref('speedValue'), () => { if (running) schedule(); });

  function paint() {
    setRunButton(btn('run'), running ? 'pause' : isDone(state) ? 'again' : 'run');
    btn('prev').disabled = running || !history.length;
    btn('step').disabled = running || isDone(state);
    render(state, { running });
  }

  function advance() {
    if (isDone(state)) return false;
    const next = step(state, { instant: playback.instant });
    if (next == null) return false;
    history.push(state);
    if (history.length > maxHistory) history.shift();
    state = next;
    return true;
  }

  function tick() {
    if (!advance() || isDone(state)) running = false;
    paint();
    if (running) schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (playback.instant) {
      for (let i = 0; i < instantCap && advance() && !isDone(state); i++) { /* run to the end */ }
      running = false;
      paint();
      return;
    }
    timer = setTimeout(tick, delay(state) / playback.multiplier);
  }

  function pause() { clearTimeout(timer); running = false; }

  const api = {
    get state() { return state; },
    get running() { return running; },
    pause() { pause(); paint(); },
    // Restart from init() (or from `nextInit` when given), forgetting the history.
    reset(nextInit) { pause(); state = (nextInit ?? init)(); history = []; paint(); },
    // Replace the state from outside (for example after a parameter changed), forgetting the history.
    set(next) { pause(); state = next; history = []; paint(); },
    paint,
    destroy: pause,
  };

  lab.on(btn('run'), 'click', () => {
    if (running) { api.pause(); return; }
    if (isDone(state)) { state = init(); history = []; }
    running = true;
    tick();
  });
  lab.on(btn('step'), 'click', () => { if (advance()) paint(); });
  lab.on(btn('prev'), 'click', () => { if (history.length && !running) { state = history.pop(); paint(); } });
  lab.cleanup(pause);
  lab.onReset(() => api.reset());
  paint();
  return api;
}
