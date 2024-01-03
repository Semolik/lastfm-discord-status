import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
var LastFmNode = require("lastfm").LastFmNode;
// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js
// │ ├─┬ preload
// │ │ └── index.js
// │ ├─┬ renderer
// │ │ └── index.html

process.env.ROOT = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.ROOT, "dist-electron");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.env.ROOT, "public")
    : path.join(process.env.ROOT, ".output/public");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let win: BrowserWindow;
const preload = path.join(process.env.DIST, "preload.js");

function bootstrap() {
    win = new BrowserWindow({
        webPreferences: {
            preload,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: false,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(process.env.VITE_PUBLIC!, "index.html"));
    }
    win.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });
}

app.whenReady().then(bootstrap);
var lastfm;
ipcMain.on("app-ready", (event, arg) => {
    lastfm = new LastFmNode({
        api_key: arg.apiKey,
        secret: "",
    });

    var trackStream = lastfm.stream(arg.username);

    trackStream.on("nowPlaying", function (track) {
        console.log("Now playing: " + track.name);
    });
    trackStream.on("stoppedPlaying", function (track) {
        console.log("Stopped playing: " + track.name);
    });

    trackStream.start();
});
