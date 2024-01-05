<template>
    <app-page title="Discord Rich Presence">
        <div
            class="discord-rpc-container"
            v-if="discordConnected && currentTrack"
        >
            <track-card :track="currentTrack" />
        </div>
        <div class="flex gap-1">
            <UBadge
                :label="discordConnected ? 'Подключено' : 'Отключено'"
                :color="discordConnected ? 'green' : 'red'"
                size="md"
            />
            <UButton
                size="sm"
                color="gray"
                variant="solid"
                v-if="!discordConnected"
                @click="reconnect"
            >
                Попробовать снова
            </UButton>
        </div>
    </app-page>
</template>
<script setup>
import { ipcRenderer } from "electron";
const reconnect = () => ipcRenderer.send("reconect-discord");
const currentTrack = ref(ipcRenderer.sendSync("get-current-track"));
discordConnected.value = ipcRenderer.sendSync("discord-rpc-status");

ipcRenderer.on("current-track", (event, arg) => {
    currentTrack.value = arg;
});
</script>
<style lang="scss" scoped>
.discord-rpc-container {
    display: flex;
}
</style>
