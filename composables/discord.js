import { ipcRenderer } from "electron";
export const discordConnected = ref(ipcRenderer.sendSync("discord-rpc-status"));
