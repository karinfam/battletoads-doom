// Lobby and engine start-up for Battletoads Doom.
// Adapted from assets/carmack.js in https://github.com/cloudflare/doom,
// Copyright (c) 2021 Cloudflare, BSD-3-Clause (see LICENSE-cloudflare).
// Changes: same-origin router, Freedoom plus toads.wad, hashed WAD loading,
// invite links as ?room=, mode toggle, no touch controls.

const hasWebAssembly = () => {
    try {
        if (typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function") {
            const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
            if (module instanceof WebAssembly.Module) return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
        }
    } catch (e) {}
    return false;
};

// The site and the router share one origin, in production and under make dev.
const web = window.location.origin;
const base = window.location.origin;
const wsbase = window.location.origin.replace(/^http/, "ws");

// wads.js is written by the site build: hashed file names for both WADs.
const WADS = window.WADS || { files: [] };

const ROOM_PATTERN = /^[a-z0-9]+-[a-z0-9]+$/;

let timer = false;
let room = false;

const adjectives = ["Grumpy", "Ecstatic", "Surly", "Prepared", "Crafty", "Alert", "Sluggish", "Testy", "Reluctant", "Languid", "Aggressive", "Hostile", "Bubbly", "Giggly", "Laughing", "Frowning", "Lethargic", "Manic", "Patient", "Philosophical", "Furious", "Laid-Back", "Easy-Going", "Cromulent", "Excitable", "Tired", "Sporty", "Warty", "Slimy", "Radical", "Gnarly"];
const nouns = ["Toad", "Frog", "Newt", "Tadpole", "Bullfrog", "Croaker", "Polliwog", "Hopper", "Amphibian", "Imp", "Demon", "Baron", "Spectre", "Cacodemon"];

const $ = (id) => document.getElementById(id);

const write = (msg) => {
    $("text").innerHTML = msg;
    $("text").style.display = "";
};

const display = (ids, v) => {
    ids.forEach((id) => {
        $(id).style.display = v ? v : "";
    });
};

const genPetName = () => `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;

const clickEffect = (id, next) => {
    const oc = $(id).className;
    $(id).className = "btn grey";
    setTimeout(() => {
        $(id).className = oc;
        if (next) next();
    }, 100);
};

const onClick = (id, func) => {
    $(id).onclick = (e) => {
        clickEffect(id, () => {
            func(e);
        });
    };
};

const typewriter = (msg) => {
    if (timer) {
        clearTimeout(timer);
        timer = false;
    }
    if (Array.isArray(msg)) {
        let i = 0;
        const w = () => {
            const f = $("footer");
            f.classList.remove("writer");
            void f.offsetWidth;
            f.classList.add("writer");
            f.innerHTML = msg[i++];
            if (i >= msg.length) i = 0;
            timer = setTimeout(w, 10000);
        };
        w();
    } else {
        $("footer").innerHTML = msg;
    }
};

const CONTROLS = ["MOVE = MOUSE, WSOP OR ARROWS, SHIFT = RUN, E = USE, AD = STRAFE (OR HOLD C)", "TAB = MAP, T = SAY, F = FULLSCREEN, LEFT MOUSE OR SPACE = FIRE"];
const DROPPED = "A player dropped. If the game stalls, start a new room from the front page.";

// The engine reads the base game and the mod from its virtual filesystem.
var commonArgs = ["-iwad", "freedoom1.wad", "-window", "-nogui", "-nomusic", "-config", "default.cfg", "-servername", "doomflare", "-nodes", "4"];
if (WADS.files.some((f) => f.name === "toads.wad")) commonArgs = commonArgs.concat(["-merge", "toads.wad"]);

// Both WADs are fetched by their hashed names (in parts, when a file is too
// big for the host's per-file limit) and written to the virtual filesystem
// once the runtime is up. Every player gets the same bytes or the game stops.
let runtimeReady;
const runtimeInitialized = new Promise((resolve) => {
    runtimeReady = resolve;
});

const fetchWad = async (file) => {
    const parts = await Promise.all(
        file.parts.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
            return new Uint8Array(await response.arrayBuffer());
        })
    );
    const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    parts.forEach((p) => {
        bytes.set(p, offset);
        offset += p.length;
    });
    return bytes;
};

const loadWads = async () => {
    const loaded = await Promise.all(WADS.files.map(fetchWad));
    await runtimeInitialized;
    WADS.files.forEach((file, i) => {
        Module.FS.writeFile(file.name, loaded[i]);
    });
};

// Starts the engine once the game data is in place.
const launch = (args) => {
    typewriter("Loading game data...");
    wadsLoaded
        .then(() => {
            display(["menu"], "none");
            display(["canvas"]);
            callMain(args);
        })
        .catch((err) => {
            console.error(err);
            display(["canvas"], "none");
            display(["menu"]);
            write('<h1 class="vspace">Could not load the game data</h1><h1>Reload the page to try again</h1>');
        });
};

const startSolo = () => {
    display(["logo", "buttons", "text"], "none");
    launch(commonArgs);
    wadsLoaded.then(() => typewriter(CONTROLS));
};

const choosePet = (next) => {
    const t = `<h1 class="vspace">Name your toad</h1><div class="pinput"><a class="btn tertiary" id="random">&#x21bb;</a><input autocorrect="off" autocomplete="off" type="text" id="petname" maxlength="20" value="${genPetName()}"/><a class="btn secondary" id="mypet">Go</a></div>`;
    write(t);
    const mp = $("petname");
    mp.oninput = () => {
        mp.value = mp.value.replace(/[^0-9a-z\ \-\!]/gi, "");
        $("mypet").className = mp.value.length ? "btn secondary" : "btn grey";
    };
    $("mypet").onclick = () => {
        if (mp.value.length) {
            clickEffect("mypet", () => {
                commonArgs = commonArgs.concat(["-pet", mp.value]);
                next();
            });
        }
    };
    onClick("random", () => {
        mp.value = genPetName();
        $("mypet").className = "btn secondary";
    });
};

const copyText = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    return Promise.resolve();
};

const startMultiplayer = () => {
    display(["buttons", "text"], "none");
    fetch(`${base}/api/newroom`)
        .then((response) => response.json())
        .then((data) => {
            choosePet(() => {
                display(["logo"], "none");
                room = data.room;
                const link = `${web}/?room=${room}`;
                let deathmatch = false;
                let t = '<h1 class="vspace">Share this link with up to three friends:</h1>';
                t += `<h1><a class="h" id="perma">${web}/?room=${room.slice(0, 8)}...${room.slice(-8)}</a></h1>`;
                t += '<h1 class="vspace">They can join until you start the game</h1>';
                t += "<h1>Go to the next screen, wait for them, then press space to start</h1>";
                t += '<div class="vspace">';
                t += '<a id="mode" class="btn grey">Mode: Co-op</a>';
                t += '<a id="clip" class="btn tertiary">Copy invite link</a>';
                t += '<a id="start" class="btn secondary">Next</a>';
                t += "</div>";
                write(t);
                $("mode").onclick = () => {
                    deathmatch = !deathmatch;
                    $("mode").textContent = deathmatch ? "Mode: Deathmatch" : "Mode: Co-op";
                    $("mode").className = deathmatch ? "btn primary" : "btn grey";
                };
                $("perma").onclick = $("clip").onclick = () => {
                    copyText(link).then(() => clickEffect("clip"));
                };
                onClick("start", () => {
                    const mode = deathmatch ? ["-deathmatch"] : [];
                    launch(commonArgs.concat(mode, ["-server", "-privateserver", "-dup", "1", "-wss", `${wsbase}/api/ws/${room}`]));
                });
            });
        })
        .catch((err) => {
            console.error(err);
            write('<h1 class="vspace">Could not create a room</h1><h1>Reload the page to try again</h1>');
        });
};

const joinRoom = () => {
    fetch(`${base}/api/room/${room}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.room) {
                if (data.gameStarted == true) {
                    write('<h1 class="vspace">Too late, this game has already started</h1><h1>Redirecting you back...</h1>');
                    setTimeout(() => {
                        window.location.replace("/");
                    }, 7000);
                } else {
                    choosePet(() => {
                        launch(commonArgs.concat(["-connect", "1", "-dup", "1", "-wss", `${wsbase}/api/ws/${room}`]));
                        wadsLoaded.then(() => typewriter(["Connecting to the host. Please wait.", "Still trying. Has the host moved on to the next screen?"]));
                    });
                }
            } else {
                display(["logo", "buttons"], "none");
                write("<h1>Invalid room. Redirecting.</h1>");
                setTimeout(() => {
                    window.location.replace("/");
                }, 3000);
            }
        });
};

let wadsLoaded;

if (hasWebAssembly()) {
    const invited = new URLSearchParams(window.location.search).get("room");
    if (invited && ROOM_PATTERN.test(invited)) room = invited;

    var Module = {
        onRuntimeInitialized: () => {
            runtimeReady();
            if (room) {
                joinRoom();
            } else {
                $("solo").className = "btn primary";
                $("multiplayer").className = "btn secondary";
                onClick("solo", startSolo);
                onClick("multiplayer", startMultiplayer);
            }
        },
        noInitialRun: true,
        preRun: () => {
            Module.FS.createPreloadedFile("", "default.cfg", "default.cfg", true, true);
        },
        printErr: (text) => {
            console.error(text);
        },
        canvas: (function () {
            const canvas = document.getElementById("canvas");
            canvas.addEventListener(
                "webglcontextlost",
                function (e) {
                    alert("WebGL context lost. You will need to reload the page.");
                    e.preventDefault();
                },
                false
            );
            return canvas;
        })(),
        // The engine reports network events on stdout as "doom: <id>, <text>".
        print: (text) => {
            if (text.startsWith("doom: ")) {
                let [id, msg] = text.slice(6).split(",");
                switch (parseInt(id)) {
                    case 2:
                        msg = ["Connected. Waiting for other players", "Still here, waiting for the host to start the game"];
                        break;
                    case 9: // disconnected from the server
                        msg = DROPPED;
                        setTimeout(() => {
                            window.location.replace("/");
                        }, 5000);
                        break;
                    case 10: // game starts
                        msg = false;
                        typewriter(CONTROLS);
                        if (room) {
                            fetch(`${base}/api/room/${room}/started`)
                                .then((response) => response.json())
                                .then(() => {
                                    console.log(`router notified that ${room} has started`);
                                });
                        }
                        break;
                    case 12: // a client timed out
                        msg = DROPPED;
                        break;
                    case 5:
                    case 8:
                        msg = false;
                        break;
                    default:
                        msg = (msg || "").trim();
                        break;
                }
                if (msg) typewriter(msg);
            }
            console.log(text);
        },
        setStatus: (text) => {
            console.log(text);
        },
        totalDependencies: 0,
        monitorRunDependencies: function (left) {
            this.totalDependencies = Math.max(this.totalDependencies, left);
            Module.setStatus(left ? "Preparing... (" + (this.totalDependencies - left) + "/" + this.totalDependencies + ")" : "All downloads complete.");
        },
    };

    window.onerror = function () {
        Module.setStatus("Exception thrown, see JavaScript console");
        Module.setStatus = function (text) {
            if (text) Module.printErr("[post-exception status] " + text);
        };
    };

    wadsLoaded = loadWads();
    wadsLoaded.catch(() => {});

    if (WADS.source) {
        $("source").href = WADS.source;
        display(["source"]);
    }
    display(["monitor"], "block");
    display(["logo", "text"]);
    display(["canvas"], "none");
    if (room) {
        write('<h1 class="vspace">Validating room...</h1>');
    } else {
        display(["buttons"]);
    }
} else {
    display(["monitor"], "block");
    display(["logo", "text"]);
    display(["canvas"], "none");
    write('<h1 class="vspace">Your browser has no WebAssembly support</h1><h1 class="vspace">You need a modern browser to play</h1>');
}
