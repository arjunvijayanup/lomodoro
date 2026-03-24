// popup.js

// Grabbing all html elements from popup.html
const sessionLabel = document.getElementById("session-label");
const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const panelYoutube = document.getElementById("panel-youtube");
const panelAmbient = document.getElementById("panel-ambient");
const panelSpotify = document.getElementById("panel-spotify");
const tabYoutube = document.getElementById("tab-youtube");
const tabAmbient = document.getElementById("tab-ambient");
const tabSpotify = document.getElementById("tab-spotify");
const ytPlayBtn = document.getElementById("yt-play-btn");
const ytVolume = document.getElementById("yt-volume");
const ytPlayer = document.getElementById("yt-player");


// Tab switching and highlighting
function switchTab(tabName) {

    // Initializing tabs as inactive
    tabYoutube.classList.remove("active");
    tabAmbient.classList.remove("active");
    tabSpotify.classList.remove("active");
    
    // Initializing panels as hidden
    panelYoutube.classList.add("hidden");
    panelAmbient.classList.add("hidden");
    panelSpotify.classList.add("hidden");

    // Highlighting correct tab and show corresponding panel
    if (tabName === "youtube") {

        tabYoutube.classList.add("active");
        panelYoutube.classList.remove("hidden");

    } else if (tabName === "ambient") {

        tabAmbient.classList.add("active");
        panelAmbient.classList.remove("hidden");

    } else if (tabName === "spotify") {

        tabSpotify.classList.add("active");
        panelSpotify.classList.remove("hidden");
        
    }

}


// addEventListener() logic for tab buttons
tabYoutube.addEventListener("click", () => switchTab("youtube"));
tabAmbient.addEventListener("click", () => switchTab("ambient"));
tabSpotify.addEventListener("click", () => switchTab("spotify"));


// ======================================================================================
// Pomodoro Timer Logic
// ======================================================================================

// Work and rest times
const WORK_DURATION = 1500; // 25 x 60 seconds
const BREAK_DURATION = 300; // 5 x 60 seconds

// Current time state variables
let isRunning = false;
let isWorkSession = true;
let timeLeft = WORK_DURATION;
let tickInterval = null;


// Time formatt handler - converts seconds into MM:SS string
function formatTime(seconds) {

    const mins = Math.floor(seconds/60);
    const secs = seconds % 60
    // padStart(2,"0") Adds a leading 0 if the minutes or seconds are single digits 
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2,"0");

}

// Timer display Update handler
function updateDisplay() {

    timerDisplay.textContent = formatTime(timeLeft);
    sessionLabel.textContent = isWorkSession ? "Work Session" : "Rest Time";

}

// Session End handler
function handleSessionEnd() {
    
    // Stop current session
    clearInterval(tickInterval);
    isRunning = false;
    startBtn.textContent = "Start";

    // Change session type
    isWorkSession = !isWorkSession;
    timeLeft = isWorkSession ? WORK_DURATION : BREAK_DURATION;
    updateDisplay();

    // Chrome notification to alert user
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: isWorkSession ? "Break over - Get back to work!" : "Work session done - Take a break!",
        message: isWorkSession ? "Starting 25 minute work session." : "Starting 5 minute break"
    });

}
// Tick update - called every second to update timer value
function tick() {

    if(timeLeft <= 0) {

        // Quit current session
        handleSessionEnd();
        return;

    }
    
    timeLeft--;
    updateDisplay();

}

// START & PAUSE button handlers
startBtn.addEventListener("click", () => {

    if(isRunning) {

        // Pause if currently running
        clearInterval(tickInterval);
        isRunning = false;
        startBtn.textContent = "Start";

    } else {

        // Start if currently paused
        tickInterval = setInterval(tick, 1000) // Called every 1000 millisecond (1 sec) to update timer
        isRunning = true;
        startBtn.textContent = "Pause";

    }

});

// RESET button handler
resetBtn.addEventListener("click", () => {

    clearInterval(tickInterval);
    isRunning = false;
    isWorkSession = true;
    timeLeft = WORK_DURATION;
    startBtn.textContent = "Start";
    updateDisplay();

});

// Youtube controls for Lofi Girl

let lofiPlaying = false;

const lofiAudio = document.getElementById("lofi-audio");

lofiAudio.volume = ytVolume.value/100;

ytPlayBtn.addEventListener("click", () => {

    if (lofiPlaying) {

        lofiAudio.pause();
        ytPlayBtn.textContent = "Play";
        lofiPlaying = false;

    } else {

        lofiAudio.play();
        ytPlayBtn.textContent = "Pause";
        lofiPlaying = true;

    }

});

// Volume slider
ytVolume.addEventListener("input", () => {
    // Convert 0-100 slider value to 0.0-1.0 for audio element
    lofiAudio.volume = ytVolume.value / 100;
});

// Handler to send commands to youtube Iframe ("playVideo", "pauseVideo")
/*function ytCommand(com, args = []) {

    ytPlayer.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: com, args: args }),
        "*"
    );
}

// Play/Pause button for YT
ytPlayBtn.addEventListener("click", () => {

    if (ytPlaying) {

        ytCommand("pauseVideo");
        ytPlayBtn.textContent = "Play";
        ytPlaying = false;

    } else {

        ytCommand("playVideo");
        ytPlayBtn.textContent = "Pause";
        ytPlaying = true;

    }

});

// Volume Slider for YT
ytVolume.addEventListener("input", () => {
    
    ytCommand("setVolume", [ytVolume.value]);

});*/




// Initialise on loading - make sure timer shows the correct time on load
updateDisplay();