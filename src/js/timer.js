// timer.js — Per-question and total exam countdown timers

export class QuestionTimer {
  constructor(seconds, onTick, onExpire) {
    this.total = seconds;
    this.remaining = seconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this._interval = null;
  }

  start() {
    this.stop();
    this._interval = setInterval(() => {
      this.remaining--;
      this.onTick(this.remaining, this.total);
      if (this.remaining <= 0) {
        this.stop();
        this.onExpire();
      }
    }, 1000);
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
  }
}

export class ExamTimer {
  constructor(totalSeconds, onTick, onExpire) {
    this.remaining = totalSeconds;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this._interval = null;
  }

  start() {
    this.stop();
    this._interval = setInterval(() => {
      this.remaining--;
      this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        this.onExpire();
      }
    }, 1000);
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
