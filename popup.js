// popup.js
// -John Taylor
// 2023-11-14

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
        // ignore b/c called from background scripts; not clicking on extension icon
        return;
    }

    b.onclick = async function () {
        theme = { colors: { frame: color, tab_background_text: '#000' } };
        var i = 0;
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
    }
}

// when a new window is created, such as pressing ctrl-n or dragging a tab to the desktop,
// change the color of the window if the "change color for new windows" checkbox is checked
// also: if extension has not run before, create local storage key: change_new and set to true
async function applyWindowTheme() {
    console.log("A new window was created:", window);
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
            let current_window = await browser.windows.getCurrent();
            browser.theme.update(current_window.id, getOldestColorTheme());
        }
    });
}

// fired when user clicks the extension's icon
window.addEventListener("load", function () { // DOMContentLoaded
    let now = new Date();
    // console.log("starting on:", now.toISOString());
    // console.log("document.readyState: ", document.readyState);

    try {
        reset.addEventListener("click", async function () {
            let current_window = await browser.windows.getCurrent();
            browser.theme.reset(current_window.id);
        });
    } catch (error) {
        // ignore b/c called from background scripts; not clicking on extension icon
    }

    // popular the all_timed_colors array with a color + the current date/time
    all_colors.forEach((color) => all_timed_colors.push(new TimedColor(color)));

    // build out the vertical list of HTML buttons
    all_colors.forEach((color) => appendButton("button_list", color));

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
