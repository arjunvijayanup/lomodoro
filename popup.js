// popup.js
// Communicates and sends requests to background.js

// Grabbing all html elements from popup.html
const sessionLabel = document.getElementById("session-label");
const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const ytPlayBtn = document.getElementById("yt-play-btn");
const ytVolume = document.getElementById("yt-volume");

// Settings panel elements
const settingsBtn      = document.getElementById("settings-btn");
const settingsOverlay  = document.getElementById("settings-overlay");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const workValue        = document.getElementById("work-value");
const workDecBtn       = document.getElementById("work-dec-btn");
const workIncBtn       = document.getElementById("work-inc-btn");
const workMinus5Btn    = document.getElementById("work-minus5-btn");
const workPlus5Btn     = document.getElementById("work-plus5-btn");
const breakValue       = document.getElementById("break-value");
const breakDecBtn      = document.getElementById("break-dec-btn");
const breakIncBtn      = document.getElementById("break-inc-btn");
const breakMinus5Btn   = document.getElementById("break-minus5-btn");
const breakPlus5Btn    = document.getElementById("break-plus5-btn");

// Settings state
let currentWorkMins  = 25;
let currentBreakMins = 5;
let settingsOpen     = false;

const WORK_MIN = 1,  WORK_MAX  = 90;
const BREAK_MIN = 1, BREAK_MAX = 30;

// ======================================================================================
// Pomodoro Timer Logic
// ======================================================================================

// Time formatt handler - converts seconds into MM:SS string
function formatTime(seconds) {

    const mins = Math.floor(seconds/60);
    const secs = seconds % 60
    // padStart(2,"0") Adds a leading 0 if the minutes or seconds are single digits 
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2,"0");

}

// Timer display Update handler
function updateDisplay(state) {

    timerDisplay.textContent = formatTime(state.timeLeft);
    sessionLabel.textContent = state.isWorkSession ? "Work Session" : "Rest Time";
    startBtn.textContent = state.isRunning ? "Pause" : "Start";

    // Restoring audio UI
    if (state.lofiPlaying !== undefined) {

        ytPlayBtn.textContent = state.lofiPlaying ? "Pause" : "Play";

    }

    if (state.lofiVolume !== undefined) {

        ytVolume.value = state.lofiVolume;

    }

    // Sync picker values from background, but only when panel is closed
    if (!settingsOpen && state.workDuration !== undefined) {

        currentWorkMins  = state.workDuration  / 60;
        currentBreakMins = state.breakDuration / 60;
        renderPickerValues();

    }

}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function renderPickerValues() {

    workValue.textContent  = `${currentWorkMins} min.`;
    breakValue.textContent = `${currentBreakMins} min.`;

}

function sendDurations() {

    chrome.runtime.sendMessage({

        type: "SET_DURATIONS",
        workDuration:  currentWorkMins  * 60,
        breakDuration: currentBreakMins * 60

    });
}

function changeWork(delta) {

    currentWorkMins = clamp(currentWorkMins + delta, WORK_MIN, WORK_MAX);
    renderPickerValues();
    sendDurations();

}

function changeBreak(delta) {

    currentBreakMins = clamp(currentBreakMins + delta, BREAK_MIN, BREAK_MAX);
    renderPickerValues();
    sendDurations();

}

// Request background.js for current state and update display
function syncWithBackground() {

    chrome.runtime.sendMessage( { type: "GET_STATE" }, (response) => { 

        if (chrome.runtime.lastError) return;
        
        if (response) updateDisplay(response); 
    
    } );

}

// START & PAUSE button handlers
startBtn.addEventListener("click", () => {

    chrome.runtime.sendMessage( { type: "GET_STATE" }, (response) => { 

        if (chrome.runtime.lastError) return;

        if (response && response.isRunning) {

            chrome.runtime.sendMessage( { type: "PAUSE_TIMER" } );

        } else {

            chrome.runtime.sendMessage( { type: "START_TIMER" } );

        }
        
        // Setting slight Delay to allow background update
        setTimeout(syncWithBackground, 100);

    });

});

// RESET button handler
resetBtn.addEventListener("click", () => {

    chrome.runtime.sendMessage( { type: "RESET_TIMER" });
    setTimeout(syncWithBackground, 100);

});

settingsBtn.addEventListener("click", () => {

    settingsOpen = true;
    settingsOverlay.classList.add("is-open");

});

function closeSettings() {

    settingsOpen = false;
    settingsOverlay.classList.remove("is-open");

}

settingsCloseBtn.addEventListener("click", closeSettings);

settingsOverlay.addEventListener("click", (e) => {

    if (e.target === settingsOverlay) closeSettings();

});

workDecBtn.addEventListener("click",    () => changeWork(-1));
workIncBtn.addEventListener("click",    () => changeWork(+1));
workMinus5Btn.addEventListener("click", () => changeWork(-5));
workPlus5Btn.addEventListener("click",  () => changeWork(+5));

breakDecBtn.addEventListener("click",    () => changeBreak(-1));
breakIncBtn.addEventListener("click",    () => changeBreak(+1));
breakMinus5Btn.addEventListener("click", () => changeBreak(-5));
breakPlus5Btn.addEventListener("click",  () => changeBreak(+5));

// ======================================================================================
// Lofi media control
// ======================================================================================

ytPlayBtn.addEventListener("click", () => {

    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {

        if (chrome.runtime.lastError) return;

        if (response && response.lofiPlaying) {

            chrome.runtime.sendMessage({ type: "PAUSE_LOFI" });

        } else {

            chrome.runtime.sendMessage({ type: "PLAY_LOFI" });

        }

        setTimeout(syncWithBackground, 100);

    });

});

// Event listener for Volume slider
ytVolume.addEventListener("input", () => {

    chrome.runtime.sendMessage({ type: "SET_VOLUME", volume: parseInt(ytVolume.value) });

});

// Initialise on loading - make sure timer shows the correct time on load
syncWithBackground();
const syncInterval = setInterval(syncWithBackground, 1000);
