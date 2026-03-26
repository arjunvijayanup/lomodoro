// background.js
// Timer state and controls of chrome.alarms
// Current state is read and commands are sent here from popup.js

const WORK_DURATION = 1500; // 25 x 60 seconds
const BREAK_DURATION = 300; // 5 x 60 seconds

// ======================================================================================
// Timer State
// ======================================================================================

let isRunning = false;
let isWorkSession = true;
let timeLeft = WORK_DURATION;
let startTime = null; 
let lofiPlaying = false;
let lofiVolume = 50;
let userVolume = 50;

// Timer Controls //
function startTimer() {

    if (isRunning) return;

    isRunning = true;

    startTime = Date.now();

    chrome.alarms.create("timerTick", { periodInMinutes: 1}); // 1 per minute
    saveState();    

}

function pauseTimer() {

    if (!isRunning) return;

    timeLeft = getTimeLeft();
    isRunning = false;
    startTime = null;

    chrome.alarms.clear("timerTick");
    saveState();

}

function resetTimer() {

    pauseTimer();

    timeLeft = WORK_DURATION;
    isWorkSession = true;
    isRunning = false;
    saveState();

}

function getTimeLeft() {

    if (isRunning && startTime !== null) {

        const elapsed = Math.floor( (Date.now() - startTime ) / 1000 );
        return Math.max(0, timeLeft - elapsed);

    }

    return timeLeft;

}

async function ensureOffScreen() {

    if (await chrome.offscreen.hasDocument()) return;

    await chrome.offscreen.createDocument({

        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Playing lofi audio stream in the background"

    });

}

function sessionEnd() {

    //pauseTimer();
    timeLeft = 0;
    isRunning = false;
    startTime = null;
    chrome.alarms.clear("timerTick");
    
    isWorkSession = !isWorkSession;
    timeLeft = isWorkSession? WORK_DURATION : BREAK_DURATION;

    // Auto start timer upon session end
    startTimer();

    // Volume ducking
    if (lofiPlaying) {

        lofiVolume = !isWorkSession ? 15 : userVolume;
        saveState();

        ensureOffScreen().then( () => {
            
            chrome.runtime.sendMessage({ target: "offscreen", type: "SET_VOLUME", volume: lofiVolume });
        
        });

    }

    // saveState();

    chrome.notifications.create({

        type: "basic",
        iconUrl: "icons/icon128.png",
        title: isWorkSession? "Rest over. Get back to work!" : "Work sesh done. Take a break!",
        message: isWorkSession? "25 minute work session starting!" : "5 minute break starting."

    });

}

// Alarm listener
chrome.alarms.onAlarm.addListener( async (alarm) => {

    await stateReady;

    if (alarm.name !== "timerTick") return;

    if (getTimeLeft() <= 0) {

        sessionEnd();
        //return;
    
    }

    // timeLeft--;
    // saveState();

});

// Save and Load state to chrome.storage.local
function saveState() {

    chrome.storage.local.set({

        timerState: { isRunning, isWorkSession, timeLeft, startTime, lofiPlaying, lofiVolume, userVolume }

    });

}

async function loadState() {

    const result = await chrome.storage.local.get("timerState");

    if (result.timerState) {

        isRunning = result.timerState.isRunning;
        isWorkSession = result.timerState.isWorkSession;
        timeLeft = result.timerState.timeLeft;
        startTime = result.timerState.startTime ?? null;
        lofiPlaying = result.timerState.lofiPlaying ?? false;
        lofiVolume = result.timerState.lofiVolume ?? 50;
        userVolume = result.timerState.userVolume ?? 50;

        if (isRunning) {

            chrome.alarms.create("timerTick", { periodInMinutes: 1 });

        }

        if (lofiPlaying) {

            await ensureOffScreen();

            chrome.runtime.sendMessage({ target: "offscreen", type: "PLAY_AUDIO", volume: lofiVolume });

        }

    }

}

// Load state when service worker starts
// loadState();

const stateReady = loadState();


// Message listener for commands from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "START_TIMER") startTimer();
    if (message.type === "PAUSE_TIMER") pauseTimer();
    if (message.type === "RESET_TIMER") resetTimer();

    if (message.type === "PLAY_LOFI") {

        lofiPlaying = true;
        saveState();
        ensureOffScreen().then( () => {

            chrome.runtime.sendMessage({ target: "offscreen", type: "PLAY_AUDIO", volume: lofiVolume });
        
        });
    
    }

    if (message.type === "PAUSE_LOFI") {

        lofiPlaying = false;
        saveState();
        ensureOffScreen().then( () => {

            chrome.runtime.sendMessage({ target: "offscreen", type: "PAUSE_AUDIO" });
        
        });
    
    }

    if (message.type === "SET_VOLUME") {

        lofiVolume = message.volume;
        userVolume = message.volume;
        saveState();
        ensureOffScreen().then( () => {

            chrome.runtime.sendMessage({ target: "offscreen", type: "SET_VOLUME", volume: lofiVolume });
        
        });
    
    }

    if (message.type === "GET_STATE") {

        sendResponse({

            isRunning,
            isWorkSession,
            timeLeft: getTimeLeft(),
            lofiPlaying,
            lofiVolume

        });

    }

    // Indication to chrome that responses can be asynchronous
    return true;

});