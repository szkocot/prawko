// timer.js — Per-question and total exam countdown timers

export class QuestionTimer {
  constructor(seconds, onTick, onExpire) {
    this.total = seconds;
    this.remaining = seconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this._interval = null;
    this._startTime = null;
    this._startRemaining = null;
  }

  start() {
    this.stop();
    this._startTime = performance.now();
    this._startRemaining = this.remaining;
    this._interval = setInterval(() => {
      const elapsed = (performance.now() - this._startTime) / 1000;
      this.remaining = Math.max(0, Math.ceil(this._startRemaining - elapsed));
      this.onTick(this.remaining, this.total);
      if (this.remaining <= 0) {
        this.stop();
        this.onExpire();
      }
    }, 250);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  reset(seconds) {
    this.stop();
    this.total = seconds;
    this.remaining = seconds;
    this._startTime = null;
    this._startRemaining = null;
  }
}

export class ExamTimer {
  constructor(totalSeconds, onTick, onExpire) {
    this.remaining = totalSeconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this._interval = null;
    this._startTime = null;
    this._startRemaining = null;
  }

  start() {
    this.stop();
    this._startTime = performance.now();
    this._startRemaining = this.remaining;
    this._interval = setInterval(() => {
      const elapsed = (performance.now() - this._startTime) / 1000;
      this.remaining = Math.max(0, Math.ceil(this._startRemaining - elapsed));
      this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        this.onExpire();
      }
    }, 250);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

export function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
