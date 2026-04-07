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

    this.handleInput = this.handleInput.bind(this);
    this.input.addEventListener('input', this.handleInput);
  }

  focus() {
    this.input.focus();
  }

  reset() {
    clearTimeout(this.fadeTimeout);
    clearTimeout(this.clearTimeout);

    this.input.value = '';
    this.display.textContent = '';
    this.display.classList.remove('fade');

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
    this.restartTimerBar();

    clearTimeout(this.fadeTimeout);
    clearTimeout(this.clearTimeout);

    this.fadeTimeout = setTimeout(() => {
      this.display.classList.add('fade');
      this.clearTimeout = setTimeout(() => {
        this.reset();
      }, this.options.clearDelay);
    }, this.options.fadeDelay);
  }

  restartTimerBar() {
    this.timerBar.style.transition = 'none';
    this.timerBar.style.transform = 'scaleX(1)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.timerBar.style.transition = `transform ${this.options.fadeDelay}ms linear`;
        this.timerBar.style.transform = 'scaleX(0)';
      });
    });
  }
}
