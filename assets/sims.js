/* Break it yourself: the scripted simulations on the FlowBank One and ProcBeacon case studies.
   The build already drew each instrument in its start state and wrote its steps as JSON
   (scripts/sims.mjs); this only moves it from step to step. Nothing here talks to a network,
   a database or a process. Without this script the page keeps the written transcript. */
(() => {
  const root = document.documentElement;
  const sims = document.querySelectorAll("[data-sim]");

  sims.forEach((sim) => {
    let data;
    try { data = JSON.parse(sim.querySelector(".sim-data").textContent); } catch { return; }
    const live = sim.querySelector(".sim-live");
    const say = sim.querySelector("[data-say]");
    const count = sim.querySelector("[data-count]");
    const act = Object.fromEntries([...sim.querySelectorAll("[data-act]")].map((button) => [button.dataset.act, button]));
    const radios = [...sim.querySelectorAll(".sim-scenarios input")];
    const bound = { text: [...sim.querySelectorAll("[data-text]")], of: [...sim.querySelectorAll("[data-of]")], scoped: [...sim.querySelectorAll("[data-for]")], when: [...sim.querySelectorAll("[data-when]")] };
    let scenario = data.scenarios[0], step = 0, timer = 0;

    const last = () => scenario.steps.length - 1;
    const stateAt = (n) => scenario.steps.slice(1, n + 1).reduce((state, { set }) => Object.assign(state, set), { ...scenario.start });

    function render(announce) {
      const state = stateAt(step);
      live.dataset.scenario = scenario.id;
      live.dataset.step = String(step);
      live.classList.toggle("is-end", step === last());
      // Only what differs is written: the build drew the start state, so the first render (and
      // most of every step) touches nothing, and the browser restyles only what changed.
      const setText = (el, value) => { if (el.textContent !== value) el.textContent = value; };
      for (const el of bound.scoped) { const hide = el.dataset.for !== scenario.id; if (el.hidden !== hide) el.hidden = hide; }
      for (const el of bound.text) setText(el, state[el.dataset.text] || el.dataset.empty || "");
      for (const el of bound.of) {
        const value = state[el.dataset.of] ?? "";
        if (el.dataset.is !== value) el.dataset.is = value;
        if (el.classList.contains("sim-chip")) setText(el, data.labels[value] ?? value);
      }
      // Variants stacked in one cell (data-when="key=value"): only the matching one shows.
      for (const el of bound.when) {
        const [key, value] = el.dataset.when.split("=");
        const on = (state[key] ?? "") === value;
        if (el.classList.contains("is-on") !== on) el.classList.toggle("is-on", on);
      }
      const line = sim.querySelector(`[data-line="${scenario.id}:${step}"]`);
      sim.querySelectorAll(".sim-story .is-now").forEach((el) => { if (el !== line) el.classList.remove("is-now"); });
      line.classList.add("is-now");
      sim.querySelectorAll(`.sim-rail[data-for="${scenario.id}"] button`).forEach((button, i) => {
        if (i === step) { if (button.getAttribute("aria-current") !== "step") button.setAttribute("aria-current", "step"); }
        else if (button.hasAttribute("aria-current")) button.removeAttribute("aria-current");
        if (button.classList.contains("is-past") !== i < step) button.classList.toggle("is-past", i < step);
      });
      setText(count, step === 0 ? `Start · ${last()} steps` : `Step ${step} of ${last()}${step === last() ? " · end" : ""}`);
      // aria-disabled rather than disabled: the button keeps focus at either end.
      const disable = (button, off) => { if (button.getAttribute("aria-disabled") !== String(off)) button.setAttribute("aria-disabled", String(off)); };
      disable(act.back, step === 0);
      disable(act.next, step === last());
      disable(act.reset, step === 0);
      if (announce) say.textContent = `${step ? `Step ${step} of ${last()}` : "Start"}. ${line.textContent}`;
    }

    function go(n) {
      const next = Math.max(0, Math.min(last(), n));
      if (next === step) return;
      step = next;
      render(true);
      if (step === last()) pause();
    }

    function pause() {
      if (!timer) return;
      clearInterval(timer);
      timer = 0;
      act.play.classList.remove("is-playing");
      act.play.textContent = "Play";
    }
    function play() {
      if (step === last()) go(0);
      act.play.classList.add("is-playing");
      act.play.textContent = "Pause";
      timer = setInterval(() => go(step + 1), 1700);
    }

    act.next.addEventListener("click", () => { pause(); go(step + 1); });
    act.back.addEventListener("click", () => { pause(); go(step - 1); });
    act.reset.addEventListener("click", () => { pause(); go(0); });
    act.play.addEventListener("click", () => { if (timer) pause(); else play(); });
    sim.querySelectorAll(".sim-rail button").forEach((button) => button.addEventListener("click", () => { pause(); go(Number(button.dataset.go)); }));
    // Arrow keys step while focus is on the controls; Home and End go to either end.
    sim.querySelector(".sim-controls").addEventListener("keydown", (event) => {
      const to = { ArrowRight: step + 1, ArrowLeft: step - 1, Home: 0, End: last() }[event.key];
      if (to === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      pause();
      go(to);
    });
    radios.forEach((radio) => radio.addEventListener("change", () => {
      if (!radio.checked) return;
      pause();
      scenario = data.scenarios.find((candidate) => candidate.id === radio.value) || data.scenarios[0];
      step = 0;
      render(true);
    }));
    document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

    // Every load starts from the first scenario's start state, the one the build drew, even
    // where the browser would restore an earlier choice of radio.
    radios.forEach((radio, i) => { radio.checked = i === 0; });
    render(false);
    sim.querySelector(".sim-static").hidden = true;
    live.hidden = false;
    sim.classList.add("is-live");
  });

  root.classList.add("sims-ready");
  root.classList.remove("sim-pending");
})();
