// popup.js
// Communicates and sends requests to background.js

// Grabbing all html elements from popup.html
const sessionLabel = document.getElementById("session-label");
const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const ytPlayBtn = document.getElementById("yt-play-btn");
const ytVolume = document.getElementById("yt-volume");

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
