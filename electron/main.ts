import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import fs from "fs";
const LastFmNode = require("lastfm").LastFmNode;
const client = require("discord-rich-presence");

interface Credentials {
    username: string;
    apiKey: string;
}

interface Config {
    discordAppName: string;
    showButton: boolean;
}

const defaultConfig: Config = {
    discordAppName: "defaultDiscordAppID",
    showButton: true,
};
const defaultCredentials: Credentials = {
    username: "",
    apiKey: "",
};

process.env.ROOT = path.join(__dirname, "..");
process.env.DIST = path.join(process.env.ROOT, "dist-electron");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.env.ROOT, "public")
    : path.join(process.env.ROOT, ".output/public");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

const defaultDiscordAppID = "969612309209186354";
const someMusicDiscordAppID = "970076164947316746";
const musicDiscordAppID = "974413655649161276";
const discordAppIdToAppName: Record<string, string> = {
    defaultDiscordAppID: defaultDiscordAppID,
    someMusicDiscordAppID: someMusicDiscordAppID,
    musicDiscordAppID: musicDiscordAppID,
};

const discordAppNameToAppId: Record<string, string> = {
    defaultDiscordAppID: "Listening to music",
    someMusicDiscordAppID: "Some music",
    musicDiscordAppID: "Music",
};

let win: BrowserWindow;
const preload = path.join(process.env.DIST, "preload.js");

const updateCredentials = (credentials: Credentials) => {
    fs.writeFileSync(
        path.join(process.env.ROOT, "credentials.json"),
        JSON.stringify(credentials)
    );
};

const readCredentials = (): Credentials => {
    const credentialsPath = path.join(process.env.ROOT, "credentials.json");
    if (fs.existsSync(credentialsPath)) {
        return JSON.parse(fs.readFileSync(credentialsPath).toString());
    } else {
        updateCredentials(defaultCredentials);
        return defaultCredentials;
    }
};

const updateConfig = (config: Config) => {
    fs.writeFileSync(
        path.join(process.env.ROOT, "config.json"),
        JSON.stringify(Object.assign(defaultConfig, config))
    );
};

const readConfig = (): Config => {
    const configPath = path.join(process.env.ROOT, "config.json");
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath).toString());
        return Object.assign(defaultConfig, config);
    }
    updateConfig(defaultConfig);
    return defaultConfig;
};

var rpc_client = client(discordAppIdToAppName[readConfig().discordAppName]);

const updateAppId = (discordAppName: string) => {
    try {
        rpc_client.disconnect();
    } catch (e) {}
    rpc_client = client(discordAppIdToAppName[discordAppName]);
};

const updatePresence = (track: any) => {
    let stateArray = [track.artist["#text"]];
    if (track.album["#text"] !== track.name) {
        stateArray.push(track.album["#text"]);
    }
    const config = readConfig();
    rpc_client.updatePresence({
        details: track.name,
        state: stateArray.join(" - "),
        largeImageKey: track.image.at(-1)["#text"],
        largeImageText:
            track.playcount > 1 ? `${track.playcount} plays ` : null,
        instance: true,
        url: track.url,
        buttons: config.showButton
            ? [
                  {
                      url: track.url,
                      label: "Открыть",
                  },
              ]
            : undefined,
    });
};

const getTrackInfo = (track: any, lastfm: any, username?: string) => {
    return new Promise((resolve, reject) => {
        lastfm.request("track.getInfo", {
            artist: track.artist["#text"],
            track: track.name,
            username: username,
            handlers: {
                success: function (data) {
                    return resolve(data);
                },
                error: function (error) {
                    console.log("Error: " + error.message);
                    return resolve(null);
                },
            },
        });
    });
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
    var interval;
    const stream = (username?: string, apiKey?: string) => {
        if (!username || !apiKey) {
            return;
        }
        if (trackStream) {
            trackStream.stop();
        }
        if (interval) {
            clearInterval(interval);
        }
        var lastfm = new LastFmNode({
            api_key: apiKey,
            secret: "",
        });

        trackStream = lastfm.stream(username);

        trackStream.on("nowPlaying", async function (track) {
            if (interval) {
                clearInterval(interval);
            }
            var trackInfo = await getTrackInfo(track, lastfm, username);
            track = {
                ...track,
                playcount: trackInfo?.track?.userplaycount,
            };
            updatePresence(track);
            interval = setInterval(() => {
                updatePresence(track);
            }, 1000 * 15);
        });
        trackStream.on("stoppedPlaying", function (track) {
            if (interval) {
                clearInterval(interval);
            }
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
    ipcMain.on("update-credentials", (event, arg: Credentials) => {
        updateCredentials(arg);
        stream(arg.username, arg.apiKey);
    });
    ipcMain.on("read-credentials", (event, arg) => {
        event.returnValue = readCredentials();
    });
    ipcMain.on("error", (event, arg) => {
        win.webContents.send("error", arg);
    });
    const credentials = readCredentials();
    stream(credentials.username, credentials.apiKey);

    ipcMain.on("get-discord-app-ids", (event, arg) => {
        event.returnValue = discordAppNameToAppId;
    });

    ipcMain.on("update-config", (event, arg: Config) => {
        const config = readConfig();
        if (arg.discordAppName !== config.discordAppName) {
            updateAppId(arg.discordAppName);
        }
        updateConfig(arg);
    });
    ipcMain.on("read-config", (event, arg) => {
        event.returnValue = readConfig();
    });
}
app.whenReady().then(bootstrap);
