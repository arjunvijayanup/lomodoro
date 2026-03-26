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

function sessionEnd() {

    //pauseTimer();
    timeLeft = 0;
    isRunning = false;
    startTime = null;
    chrome.alarms.clear("timerTick");
    
    isWorkSession = !isWorkSession;
    timeLeft = isWorkSession? WORK_DURATION : BREAK_DURATION;
    saveState();

    chrome.notifications.create({

        type: "basic",
        iconUrl: "icons/icon128.png",
        title: isWorkSession? "Rest over. Get back to work!" : "Work sesh done. Take a break!",
        message: isWorkSession? "25 minute work session starting!" : "5 minute break starting."

    });

}

// Alarm listener
chrome.alarms.onAlarm.addListener( (alarm) => {

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

        timerState: { isRunning, isWorkSession, timeLeft, startTime }

    });

}

async function loadState() {

    const result = await chrome.storage.local.get("timerState");

    if (result.timerState) {

        isRunning = result.timerState.isRunning;
        isWorkSession = result.timerState.isWorkSession;
        timeLeft = result.timerState.timeLeft;
        startTime = result.timerState.startTime ?? null;

        if (isRunning) {

            chrome.alarms.create("timerTick", { periodInMinutes: 1 });

        }

    }

}

// Load state when service worker starts
loadState();

// Message listener for commands from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "START_TIMER") startTimer();
    if (message.type === "PAUSE_TIMER") pauseTimer();
    if (message.type === "RESET_TIMER") resetTimer();

    if (message.type === "GET_STATE") {

        sendResponse({

            isRunning,
            isWorkSession,
            timeLeft: getTimeLeft()

        });

    }

    // Indication to chrome that responses can be asynchronous
    return true;

});