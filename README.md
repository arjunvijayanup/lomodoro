# Lomodoro

A Chrome extension that combines a Pomodoro timer with a lofi audio stream. The timer runs continuously in the background - closing the popup does not pause it - and the audio stream persists independently of the popup's lifecycle.

---

## Features

- 25-minute work sessions alternating with 5-minute breaks, auto-advancing on completion
- Desktop notification at each session boundary
- Lofi audio stream with volume control, ducked automatically to 15% during breaks and restored to your set level on work sessions
- Timer and audio state survive browser restarts

---

## How it works

### Architecture

The extension is built on Chrome Manifest V3 and uses three distinct execution contexts:

```
popup.html / popup.js       UI layer. Opens and closes with the popup window.
background.js               Service worker. Owns all timer state and routes audio commands.
offscreen.html / offscreen.js   Hidden offscreen document. Holds the audio element.
```

The popup is a thin display layer. It polls `background.js` every second for the current state and renders it. All logic lives in the service worker.

### Timer

`chrome.alarms` has a minimum interval of roughly one minute, so the timer does not decrement on each alarm tick. Instead:

- When the timer starts, `startTime = Date.now()` is recorded and a one-shot alarm is scheduled at `delayInMinutes: timeLeft / 60` - the exact moment the session should end.
- The real-time countdown displayed in the popup is computed on every poll as `timeLeft - Math.floor((Date.now() - startTime) / 1000)`.
- When the alarm fires, `getTimeLeft() <= 0` triggers `sessionEnd()`, which flips the session type, resets the countdown, and immediately calls `startTimer()` to schedule the next alarm.

If the service worker is terminated and restarted (which Chrome does aggressively), `loadState()` reads the persisted state from `chrome.storage.local` and reschedules the alarm using the same `delayInMinutes: getTimeLeft() / 60` formula, so the timer recovers correctly.

### Audio

Chrome MV3 service workers cannot play audio directly. Audio is handled by an offscreen document - a hidden, persistent HTML page that Chrome keeps alive independently of the popup.

- `ensureOffScreen()` creates the offscreen document lazily the first time audio is needed, using a singleton Promise to prevent race conditions if called concurrently.
- `background.js` sends `PLAY_AUDIO`, `PAUSE_AUDIO`, and `SET_VOLUME` messages to the offscreen document.
- The offscreen document controls a standard HTML `<audio>` element pointed at a lofi stream URL.

### Volume ducking

Two volume values are tracked separately:

- `userVolume` - the value the user set via the slider. Never modified automatically.
- `lofiVolume` - the value actually sent to the audio element. Set to `userVolume` during work sessions and ducked to 15 during breaks.

When a session ends, `lofiVolume` is updated before `saveState()` so the correct volume is restored if the service worker restarts mid-session.

### State persistence

All timer and audio state is written to `chrome.storage.local` on every change via `saveState()`. On service worker startup, `loadState()` reads this state and reconstructs the running condition, including rescheduling the alarm and resuming audio playback if it was active.

### Race condition fix

When the service worker wakes for an alarm event, in-memory variables hold their initial defaults until `loadState()` completes. The alarm listener awaits `stateReady` (the Promise returned by `loadState()`) before acting, ensuring it always operates on the restored state.

---

## Message protocol

All inter-context communication uses `chrome.runtime.sendMessage`.

**popup.js to background.js**

| Type | Description |
|---|---|
| `GET_STATE` | Returns `{ isRunning, isWorkSession, timeLeft, lofiPlaying, lofiVolume }` |
| `START_TIMER` | Starts or resumes the timer |
| `PAUSE_TIMER` | Pauses the timer and records remaining time |
| `RESET_TIMER` | Stops the timer and resets to a 25-minute work session |
| `PLAY_LOFI` | Starts audio playback |
| `PAUSE_LOFI` | Pauses audio playback |
| `SET_VOLUME` | Sets `userVolume` and `lofiVolume`, forwards to offscreen |

**background.js to offscreen.js**

| Type | Payload | Description |
|---|---|---|
| `PLAY_AUDIO` | `volume` | Sets volume and calls `audio.play()` |
| `PAUSE_AUDIO` | - | Calls `audio.pause()` |
| `SET_VOLUME` | `volume` | Updates `audio.volume` without starting playback |

All messages to `offscreen.js` include `target: "offscreen"` so the listener can ignore unrelated broadcasts.

---

## File structure

```
manifest.json       Extension manifest (MV3). Declares permissions and entry points.
popup.html          Popup markup.
popup.css           Popup styles.
popup.js            Popup logic: polls background for state, sends user commands.
background.js       Service worker: timer state, alarm scheduling, audio routing.
offscreen.html      Hidden page that hosts the audio element.
offscreen.js        Controls the audio element in response to messages from background.js.
icons/              Extension icons (48px, 128px).
```

---

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Persist timer and audio state across service worker restarts and browser sessions |
| `alarms` | Schedule one-shot alarm to fire at exact session end time |
| `notifications` | Desktop notification when a work or break session ends |
| `offscreen` | Create and manage the hidden offscreen document for audio playback |

---

## Installation (unpacked)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the project folder.
5. The Lomodoro icon will appear in the Chrome toolbar.

---

## Audio

The lofi stream is provided by [ilovemusic.de](https://ilovemusic.de). The stream URL is configured in `offscreen.html`. If the stream becomes unavailable, replace the `src` attribute on the `<audio>` element with an alternative MP3 stream URL.

---

## Known limitations

- Chrome clamps `chrome.alarms` to a minimum interval. The one-shot alarm may fire a few seconds late on slow machines, though this does not affect countdown accuracy since time is computed from `Date.now()`.
- Desktop notifications on macOS require Chrome notification permissions to be enabled in System Settings > Notifications > Google Chrome.
- The volume slider fires on every drag pixel (`input` event). This is intentional for responsiveness but sends frequent messages to the service worker. Low priority for optimisation.
- The Ambient Sounds and Spotify panels visible in the UI are not yet wired up.
