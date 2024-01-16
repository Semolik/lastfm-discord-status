import {
    app,
    BrowserWindow,
    ipcMain,
    shell,
    Tray,
    Menu,
    nativeImage,
} from "electron";
import path from "path";
import fs from "fs";
import { Client } from "@xhayper/discord-rpc";
import { createServer } from "http";
const LastFmNode = require("lastfm").LastFmNode;
const unhandled = require("electron-unhandled");
const handler = require("serve-handler");
interface Credentials {
    username: string;
    apiKey: string;
}

interface Config {
    discordAppName: string;
    button: "off" | "track" | "profile";
    runOnStartup?: boolean;
    runAsBackground: boolean;
}

const defaultConfig: Config = {
    discordAppName: "defaultDiscordAppID",
    button: "track",
    runAsBackground: false,
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
const preload = path.join(process.env.DIST, "preload.js");
const distPath = path.join(__dirname, "../.output/public");

let win: BrowserWindow;
let client: Client;
var clientReady = false;

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
const writeConfig = (config: Config) => {
    fs.writeFileSync(
        path.join(process.env.ROOT, "config.json"),
        JSON.stringify({
            ...Object.assign(defaultConfig, config),
            runOnStartup: undefined,
        })
    );
};

const readConfig = (): Config => {
    const configPath = path.join(process.env.ROOT, "config.json");
    if (fs.existsSync(configPath)) {
        var config = Object.assign(
            defaultConfig,
            JSON.parse(fs.readFileSync(configPath).toString())
        );

        if (!config.runOnStartup && config.runAsBackground) {
            config.runAsBackground = false;
            writeConfig(config);
        }
        return { ...config };
    }
    writeConfig(defaultConfig);
    return defaultConfig;
};
const getActivityJson = (track: any) => {
    let stateArray = [track.artist["#text"]];
    if (track.album["#text"] !== track.name) {
        stateArray.push(track.album["#text"]);
    }
    let largeImageText = undefined;
    if (track.playcount > 1) {
        largeImageText = `Прослушано ${track.playcount} ${pluralize(
            track.playcount,
            ["раз", "раза", "раз"]
        )}`;
    }
    const config = readConfig();
    const username = readCredentials().username;
    return {
        details: track.name,
        state: stateArray.join(" - "),
        largeImageKey: track.image.at(-1)["#text"],
        largeImageText: largeImageText,
        instance: true,
        buttons:
            config.button !== "off"
                ? getButtons(
                      config.button == "track"
                          ? track.url
                          : `https://www.last.fm/user/${username}`
                  )
                : undefined,
    };
};
const updatePresence = async (track: any) => {
    if (!clientReady) {
        return;
    }
    const activityJson = getActivityJson(track);
    await client.user?.setActivity(activityJson);
    win.webContents.send("current-track", activityJson);
};

const getButtons = (url: string) => {
    return [
        {
            url: url,
            label: "Открыть",
        },
    ];
};
const pluralize = (number: number, words: string[]) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[
        number % 100 > 4 && number % 100 < 20
            ? 2
            : cases[number % 10 < 5 ? number % 10 : 5]
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

function setMainMenu() {
    const template = [
        {
            label: "О программе",
            submenu: [
                {
                    label: "Разработчик приложения",
                    click() {
                        shell.openExternal("https://github.com/Semolik");
                    },
                },
                {
                    label: "Github",
                    click() {
                        shell.openExternal(
                            "https://github.com/Semolik/lastfm-discord-status"
                        );
                    },
                },
                {
                    type: "separator",
                },

                { label: "Закрыть", role: "quit" },
            ],
        },
        {
            label: "Правка",
            submenu: [
                { label: "Назад", role: "undo" },
                { label: "Вперед", role: "redo" },
                { type: "separator" },
                { label: "Вырезать", role: "cut" },
                { label: "Копировать", role: "copy" },
                { label: "Вставить", role: "paste" },
                { label: "Выделить все", role: "selectAll" },
            ],
        },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
function bootstrap() {
    const openHidden = process.argv.includes("--hidden");
    win = new BrowserWindow({
        width: 650,
        height: 350,
        title: "Last.fm Discord Status",
        webPreferences: {
            preload,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: false,
        },
        resizable: false,
        show: !openHidden,
    });
    setMainMenu();
    const icon = nativeImage.createFromPath(
        path.join(process.env.VITE_PUBLIC, "MdiLastfm.png")
    );
    const tray = new Tray(icon);
    const getContextMenu = (hided: boolean) =>
        Menu.buildFromTemplate([
            hided
                ? {
                      label: "Открыть",
                      click: () => {
                          win.show();
                          tray.setContextMenu(getContextMenu(false));
                      },
                  }
                : {
                      label: "Скрыть",
                      click: () => {
                          win.hide();
                          tray.setContextMenu(getContextMenu(true));
                      },
                  },
            {
                label: "Выход",
                click: () => {
                    app.quit();
                },
            },
        ]);

    tray.setToolTip("Last.fm Discord Status");
    tray.setContextMenu(getContextMenu(openHidden));
    win.on("page-title-updated", function (e) {
        e.preventDefault();
    });

    win.on("show", function () {
        tray.setContextMenu(getContextMenu(false));
    });

    win.on("hide", function () {
        tray.setContextMenu(getContextMenu(true));
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        win.webContents.openDevTools({ mode: "detach" });
    } else {
        const server = createServer((req, res) => {
            return handler(req, res, {
                public: process.env.VITE_PUBLIC,
            });
        });

        server.listen(1111, () => {
            win.loadURL("http://localhost:1111/");
        });
    }
    win.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    var trackStream;
    var interval;
    var updatePresenceLocal: Function | null = null;
    var currentTrack: any;
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
        currentTrack = null;
        var lastfm = new LastFmNode({
            api_key: apiKey,
            secret: "",
        });

        trackStream = lastfm.stream(username);

        const stopCurrentPresenceUpdate = () => {
            updatePresenceLocal = null;
            currentTrack = null;
            if (interval) {
                clearInterval(interval);
            }
        };
        trackStream.on("stoppedPlaying", () => {
            stopCurrentPresenceUpdate();
            client.user?.clearActivity();
            win.webContents.send("current-track", null);
        });
        trackStream.on("nowPlaying", async function (track) {
            stopCurrentPresenceUpdate();
            var trackInfo = await getTrackInfo(track, lastfm, username);
            currentTrack = {
                ...track,
                playcount: trackInfo?.track?.userplaycount || 0,
            };
            updatePresenceLocal = async () =>
                await updatePresence(currentTrack);
            await updatePresenceLocal();
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
    ipcMain.on("get-current-track", (event, arg) => {
        event.returnValue = currentTrack ? getActivityJson(currentTrack) : null;
    });
    const updateAppId = (discordAppName: string) => {
        if (client) {
            try {
                client.destroy();
            } catch (e) {}
        }

        clientReady = false;
        client = new Client({
            clientId: discordAppIdToAppName[discordAppName],
        });
        try {
            client.login();
        } catch (e) {
            win.webContents.send("discord-rpc-status", false);
            win.webContents.send("error", {
                message: "Не удалось подключиться к Discord",
            });
        }
        win.webContents.send("discord-rpc-status", false);
        client.on("ready", async () => {
            clientReady = true;
            win.webContents.send("discord-rpc-status", true);
            if (updatePresenceLocal) {
                await updatePresenceLocal();
            }
        });
        client.on("disconnected", () => {
            clientReady = false;
            win.webContents.send("discord-rpc-status", false);
        });
    };
    const updateConfig = (config: Config) => {
        const oldconfig = readConfig();
        if (oldconfig.discordAppName !== config.discordAppName) {
            updateAppId(config.discordAppName);
        }
        if (
            config.runOnStartup !== oldconfig.runOnStartup ||
            config.runAsBackground !== oldconfig.runAsBackground
        ) {
            app.setLoginItemSettings({
                openAtLogin: config.runOnStartup,
                args:
                    config.runOnStartup && config.runAsBackground
                        ? ["--hidden"]
                        : [],
            });
        }
        if (!config.runOnStartup && config.runAsBackground) {
            config.runAsBackground = false;
            console.log(
                "runAsBackground can't be enabled without runOnStartup"
            );
        }

        writeConfig(config);
    };
    ipcMain.on("reconect-discord", async (event, arg) => {
        const config = readConfig();
        updateAppId(config.discordAppName);
    });
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

    ipcMain.on("get-discord-app-ids", (event, arg) => {
        event.returnValue = discordAppNameToAppId;
    });
    ipcMain.on("discord-rpc-status", (event, arg) => {
        event.returnValue = client.isConnected;
    });

    ipcMain.on("update-config", (event, arg: Config) => {
        updateConfig(arg);
        updatePresenceLocal && updatePresenceLocal();
    });
    ipcMain.on("read-config", (event, arg) => {
        event.returnValue = readConfig();
    });
    const config = readConfig();
    updateAppId(config.discordAppName);
    const { username, apiKey } = readCredentials();
    stream(username, apiKey);
}
app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
unhandled({
    logger: (error) => {
        try {
            if (error.code === 2) {
                win.webContents.send("discord-rpc-status", false);
                win.webContents.send("error", {
                    message: "Не удалось подключиться к Discord",
                });
            } else {
                win.webContents.send("error", {
                    message: error.message,
                });
            }
        } catch (e) {}
    },
});
