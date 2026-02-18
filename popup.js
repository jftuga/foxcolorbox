// popup.js
// -John Taylor
// 2023-11-14

/*
This script is instantiated twice:
1) in manifest.json, background -> scripts
2) in popup.html, script tag

Because of this, try/catch must be used in a few places to ignore exceptions
because the caller is from background scripts; not by the user clicking on the extension icon (which is used by popup.html)
*/

console.log("In foxcolorbox popup.js");

// https://htmlcolorcodes.com/color-names/
var all_colors = ["LightCoral", "LightSalmon", "LightPink", "LightSalmon", "PeachPuff", "Khaki", "Thistle",
    "Violet", "LightGreen", "YellowGreen", "Turquoise", "LightSkyBlue", "Wheat", "Peru",
    "LightGray", "DarkGray"];

// an array of TimedColor objects
var all_timed_colors = [];

// each color has an associated time that is was last used
class TimedColor {
    constructor(color) {
        this.color = color;
        let now = new Date();
        this.last_access = now.toISOString();
    }
}

// keep a history of what time the last color was used and then select the LRU color
function getOldestColorTheme() {
    console.log("NEW WINDOW  : ", all_timed_colors[0], 0);
    theme = { colors: { frame: all_timed_colors[0].color, tab_background_text: '#000' } };
    let now = new Date();
    all_timed_colors[0].last_access = now.toISOString();
    all_timed_colors.sort((a, b) => {
        return a.last_access > b.last_access;
    });
    return theme;
}

// adds a new, colored button to the button_list div
function appendButton(elementId, color) {
    var b = document.createElement("button");
    b.innerText = color;
    b.style.background = color;
    b.style.width = "100px";

    try {
        document.getElementById(elementId).appendChild(b);
        document.getElementById(elementId).appendChild(document.createElement("br"));
    } catch (error) {
        // ignore b/c called from background scripts; not by clicking on the extension icon
        return;
    }

    b.onclick = async function () {
        theme = { colors: { frame: color, tab_background_text: '#000' } };
        var i = 0;
        // since the button list is small, just iterate over all objects instead of using a hash table
        for (const timed_color of all_timed_colors) {
            if (timed_color.color === color) {
                let now = new Date();
                all_timed_colors[i].last_access = now.toISOString();
                console.log("BUTTON CLICK: ", all_timed_colors[i], i);
                break;
            }
            i += 1;
        };
        all_timed_colors.sort((a, b) => {
            return a.last_access < b.last_access;
        });

        let current_window = await browser.windows.getLastFocused();
        browser.theme.update(current_window.id, theme);
        // save the chosen colour to the window's session so it survives browser restart
        browser.sessions.setWindowValue(current_window.id, "color", color);
    }
}

// when a new window is created, such as pressing ctrl-n or dragging a tab to the desktop,
// change the color of the window if the "change color for new windows" checkbox is checked
// also: if extension has not run before, create local storage key: change_new and set to true
// if the window is being restored from a previous session, reapply its saved colour instead
async function applyWindowTheme(new_window) {
    console.log("A new window was created:", new_window.id);

    // check if this window has a colour saved from a previous session (e.g. after browser restart)
    const saved_color = await browser.sessions.getWindowValue(new_window.id, "color");
    if (saved_color) {
        console.log("Restoring saved session colour:", saved_color, "for window:", new_window.id);
        browser.theme.update(new_window.id, { colors: { frame: saved_color, tab_background_text: '#000' } });
        return;
    }

    // no saved colour - this is a brand new window, apply LRU colour if change_new is enabled
    x = browser.storage.local.get();
    x.then(async obj => {
        console.log("obj:", obj);
        has_cn_storage_key = false;
        if (obj.hasOwnProperty("change_new") === false) {
            console.log("Adding change_new key to local storage");
            has_cn_storage_key = true;
            browser.storage.local.set({ "change_new": true });
            console.log("[storage save] setting change_new: true");
        }
        if (obj["change_new"] === true || has_cn_storage_key === true) {
            const theme = getOldestColorTheme();
            browser.theme.update(new_window.id, theme);
            // save the auto-assigned colour to the session so it is restored on restart
            browser.sessions.setWindowValue(new_window.id, "color", theme.colors.frame);
        }
    });
}

// fired when user clicks the extension's icon
window.addEventListener("load", async function () { // DOMContentLoaded
    let now = new Date();
    // console.log("starting on:", now.toISOString());
    // console.log("document.readyState: ", document.readyState);

    try {
        reset.addEventListener("click", async function () {
            let current_window = await browser.windows.getCurrent();
            browser.theme.reset(current_window.id);
            // clear the saved session colour so default theme is restored on restart too
            browser.sessions.removeWindowValue(current_window.id, "color");
        });
    } catch (error) {
        // ignore b/c called from background scripts; not by clicking on the extension icon
    }

    // populate the all_timed_colors array with a color + the current date/time
    all_colors.forEach((color) => all_timed_colors.push(new TimedColor(color)));

    // build out the vertical list of HTML buttons
    all_colors.forEach((color) => appendButton("button_list", color));

    // scan all currently open windows and restore any saved session colours
    // this catches session-restored windows that were created before the onCreated listener registered
    const existing_windows = await browser.windows.getAll();
    for (const win of existing_windows) {
        const saved_color = await browser.sessions.getWindowValue(win.id, "color");
        if (saved_color) {
            console.log("Startup: restoring colour", saved_color, "for window", win.id);
            browser.theme.update(win.id, { colors: { frame: saved_color, tab_background_text: '#000' } });
        }
    }

    try {
        // uncheck the checkbox in the HTML if the storage value for change_new is set to false
        console.log("is checked? ", document.getElementById("change_new").checked);
        x = browser.storage.local.get();
        x.then(obj => {
            console.log("change_new => obj:", obj["change_new"])
            if (obj["change_new"] === false) {
                console.log("unchecking: ", document.getElementById("change_new"));
                document.getElementById("change_new").checked = false;
            }
        });

        // button has either been checked or unchecked
        var change_new_selector = document.getElementById("change_new");
        change_new_selector.addEventListener('change', function () {
            if (this.checked) {
                browser.storage.local.set({ "change_new": true });
                document.getElementById("change_new").checked = true;
                console.log("[storage save] setting change_new: true");
            } else {
                browser.storage.local.set({ "change_new": false })
                document.getElementById("change_new").checked = false;
                console.log("[storage save] setting change_new: false");
            }
        });
    } catch (error) {
        // ignore b/c called from background scripts; not by clicking on extension icon
    }

}); // window.addEventListener

// occurs when a new browser window is created
browser.windows.onCreated.addListener(applyWindowTheme);
