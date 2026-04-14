const DEFAULT_OPTIONS = {
  fadeDelay: 2000,
  clearDelay: 800,
};

export class VanishingTyping {
  constructor(options) {
    this.display = options.display;
    this.input = options.input;
    this.hint = options.hint;
    this.timerBar = options.timerBar;
    this.onFirstInput = options.onFirstInput ?? null;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    this.fadeTimeout = null;
    this.clearTimeout = null;
    this.started = false;
    this.isPaused = false;
    this.fadeStartedAt = 0;
    this.remainingFadeDelay = this.options.fadeDelay;
    this.rafId = null;

    this.handleInput = this.handleInput.bind(this);
    this.input.addEventListener('input', this.handleInput);
  }

  focus() {
    this.input.focus();
  }

  reset() {
    clearTimeout(this.fadeTimeout);
    clearTimeout(this.clearTimeout);
    cancelAnimationFrame(this.rafId);

    this.input.value = '';
    this.display.textContent = '';
    this.display.classList.remove('fade');
    this.isPaused = false;
    this.fadeStartedAt = 0;
    this.remainingFadeDelay = this.options.fadeDelay;

    this.timerBar.style.transition = 'none';
    this.timerBar.style.transform = 'scaleX(1)';
  }

  handleInput() {
    if (!this.started) {
      this.started = true;
      this.hint.classList.add('hidden');
      this.onFirstInput?.();
    }

    this.display.textContent = this.input.value;
    this.display.classList.remove('fade');
    this.remainingFadeDelay = this.options.fadeDelay;
    this.startFadeTimer(this.remainingFadeDelay);
    this.renderTimerBar(1);
    this.animateTimerBar();
  }

  pauseFadeTimer() {
    if (this.isPaused || !this.fadeStartedAt) {
      return;
    }

    this.isPaused = true;
    clearTimeout(this.fadeTimeout);
    cancelAnimationFrame(this.rafId);
    const elapsed = Date.now() - this.fadeStartedAt;
    this.remainingFadeDelay = Math.max(0, this.remainingFadeDelay - elapsed);
    this.renderTimerBar(this.remainingFadeDelay / this.options.fadeDelay);
  }

  resumeFadeTimer() {
    if (!this.isPaused || !this.display.textContent) {
      return;
    }

    this.isPaused = false;
    this.startFadeTimer(this.remainingFadeDelay);
    this.animateTimerBar();
  }

  startFadeTimer(delay) {
    clearTimeout(this.fadeTimeout);
    clearTimeout(this.clearTimeout);

    this.fadeStartedAt = Date.now();
    this.remainingFadeDelay = delay;
    this.fadeTimeout = setTimeout(() => {
      this.display.classList.add('fade');
      this.clearTimeout = setTimeout(() => {
        this.reset();
      }, this.options.clearDelay);
    }, delay);
  }

  animateTimerBar() {
    cancelAnimationFrame(this.rafId);

    const tick = () => {
      if (this.isPaused || !this.fadeStartedAt) {
        return;
      }

      const elapsed = Date.now() - this.fadeStartedAt;
      const progress = Math.max(0, 1 - (elapsed / this.remainingFadeDelay));
      this.renderTimerBar(progress);

      if (progress > 0) {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  renderTimerBar(progress) {
    this.timerBar.style.transition = 'none';
    this.timerBar.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
  }
}
