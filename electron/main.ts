import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";

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
const updateCredentials = (credentials: any) => {
    fs.writeFileSync(
        path.join(process.env.ROOT, "credentials.json"),
        JSON.stringify({
            username: credentials.username,
            apiKey: credentials.apiKey,
        })
    );
};
const readCredentials = () => {
    const credentialsPath = path.join(process.env.ROOT, "credentials.json");
    if (fs.existsSync(credentialsPath)) {
        return JSON.parse(fs.readFileSync(credentialsPath).toString());
    } else {
        updateCredentials({
            username: "",
            apiKey: "",
        });
    }
    return {
        username: "",
        apiKey: "",
    };
};

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
        win.loadFile(path.join(process.env.ROOT, "index.html"));
    }
    win.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    var trackStream;
    const stream = (username?: string, apiKey?: string) => {
        if (!username || !apiKey) {
            return;
        }
        if (trackStream) {
            trackStream.stop();
        }

        var lastfm = new LastFmNode({
            api_key: apiKey,
            secret: "",
        });

        trackStream = lastfm.stream(username);

        trackStream.on("nowPlaying", function (track) {
            console.log("Now playing: " + track.name);
        });
        trackStream.on("stoppedPlaying", function (track) {
            console.log("Stopped playing: " + track.name);
        });
        trackStream.on("error", function (error) {
            console.log("Error: " + error.message);
            switch (error.message) {
                case "User not found":
                    win.webContents.send("error-username");
                    break;
                case "Invalid API key":
                    win.webContents.send("error-api-key");
                    break;
                case "Invalid API key - You must be granted a valid key by last.fm":
                    win.webContents.send("error-api-key");
                    break;
                default:
                    win.webContents.send("error", {
                        message: error.message,
                    });
                    break;
            }
        });
        trackStream.start();
    };
    ipcMain.on("update-credentials", (event, arg) => {
        updateCredentials(arg);
        stream(arg.username, arg.apiKey);
    });
    ipcMain.on("read-credentials", (event, arg) => {
        event.returnValue = readCredentials();
    });
    const credentials = readCredentials();
    stream(credentials.username, credentials.apiKey);
}

app.whenReady().then(bootstrap);
