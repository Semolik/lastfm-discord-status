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
    button: "off" | "track" | "profile";
}

const defaultConfig: Config = {
    discordAppName: "defaultDiscordAppID",
    button: "track",
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

const defaultDiscordAppID = "1192427927074259038";
const playingNowDiscordAppID = "1192746501483544617";
const musicDiscordAppID = "1192746539915939893";
const discordAppIdToAppName: Record<string, string> = {
    defaultDiscordAppID,
    playingNowDiscordAppID,
    musicDiscordAppID,
};

const discordAppNameToAppId: Record<string, string> = {
    defaultDiscordAppID: "Слушаю музыку",
    playingNowDiscordAppID: "Играет сейчас",
    musicDiscordAppID: "Музыка",
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
    const username = readCredentials().username;
    rpc_client.updatePresence({
        details: track.name,
        state: stateArray.join(" - "),
        largeImageKey: track.image.at(-1)["#text"],
        largeImageText: getLargeImageText(track.playcount),
        instance: true,
        buttons:
            config.button !== "off"
                ? getButtons(
                      config.button == "track"
                          ? track.url
                          : `https://www.last.fm/user/${username}`
                  )
                : undefined,
    });
};

const getLargeImageText = (playcount: number) => {
    if (playcount > 1) {
        return `Прослушано ${playcount} раз${playcount > 4 ? "" : "а"}`;
    }
    return undefined;
};

const getButtons = (url: string) => {
    return [
        {
            url: url,
            label: "Открыть",
        },
    ];
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
        let updatePresenceLocal: Function | null = null;
        const stopCurrentPresence = () => {
            updatePresenceLocal = null;
            if (interval) {
                clearInterval(interval);
            }
        };
        trackStream.on("stoppedPlaying", stopCurrentPresence);
        trackStream.on("nowPlaying", async function (track) {
            stopCurrentPresence();
            var trackInfo = await getTrackInfo(track, lastfm, username);
            track = {
                ...track,
                playcount: trackInfo?.track?.userplaycount || 0,
            };
            updatePresenceLocal = () => updatePresence(track);
            updatePresenceLocal();
            interval = setInterval(updatePresenceLocal, 1000 * 15);
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
