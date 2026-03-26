// offscreen.js
// Controls the audio element in a hidden offscreen document

const audio = document.getElementById("lofi-audio");

chrome.runtime.onMessage.addListener( (message) => {

    if (message.target !== "offscreen") return;

    if (message.type === "PLAY_AUDIO") {

        audio.volume = Math.min(100, Math.max(0, message.volume)) / 100;
        audio.play().catch(err => console.error("[Lomodoro] audio play failed:", err));

    }

    if (message.type === "PAUSE_AUDIO") {

        audio.pause();

    }

    if (message.type === "SET_VOLUME") {

        audio.volume = Math.min(100, Math.max(0, message.volume)) / 100;

    }

});