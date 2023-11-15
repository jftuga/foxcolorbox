// popup.js
// -John Taylor
// 2023-11-14

// https://htmlcolorcodes.com/color-names/
var all_colors = ["IndianRed", "DarkRed", "PaleVioletRed", "LightSalmon", "PeachPuff", "DarkKhaki", "Plum",
    "MediumPurple", "LightGreen", "DarkCyan", "Turquoise", "DeepSkyBlue", "Wheat", "Peru",
    "DarkGray", "SlateGray"];

// an array of TimedColor objects
var all_timed_colors = [];

class TimedColor {
    constructor(color) {
        this.color = color;
        let now = new Date();
        this.last_access = now.toISOString();
    }
}

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

function appendButton(elementId, color) {
    var b = document.createElement("button");
    b.innerText = color;
    b.style.background = color;
    b.style.width = "100px";

    try {
        document.getElementById(elementId).appendChild(b);
        document.getElementById(elementId).appendChild(document.createElement("br"));
    } catch (error) {
        // page is not fully loaded yet
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

async function applyWindowTheme() {
    let current_window = await browser.windows.getCurrent();
    browser.theme.update(current_window.id, getOldestColorTheme());
}

document.addEventListener("DOMContentLoaded", function () {
    try {
        reset.addEventListener("click", async function () {
            let current_window = await browser.windows.getCurrent();
            browser.theme.reset(current_window.id);
        });
    } catch (error) {
        // page is not fully loaded yet
    }

    all_colors.forEach((color) => all_timed_colors.push(new TimedColor(color)));
    all_colors.forEach((color) => appendButton("button_list", color));
});

browser.windows.onCreated.addListener(applyWindowTheme);
