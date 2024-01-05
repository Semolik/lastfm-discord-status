<template>
    <div class="app">
        <app-aside />
        <nuxt-page />
    </div>

    <UNotifications />
</template>
<script setup>
import { ipcRenderer } from "electron";

const toast = useToast();

ipcRenderer.on("error", (event, arg) => {
    toast.add({ title: arg.message, color: "red" });
});
ipcRenderer.on("error-username", (event, arg) => {
    if (usernameErrored.value) return;
    usernameErrored.value = true;
    toast.add({ title: "Пользователь не найден", color: "red" });
});
ipcRenderer.on("error-api-key", (event, arg) => {
    if (apiKeyErrored.value) return;
    apiKeyErrored.value = true;
    toast.add({ title: "Неверный API-ключ", color: "red" });
});

ipcRenderer.on("discord-rpc-status", (event, arg) => {
    discordConnected.value = arg;
});
</script>
<style lang="scss" scoped>
.app {
    display: flex;
    height: 100%;
}
</style>
