<template>
    <app-page title="Discord settings">
        <app-input-wrapper label="Discord app">
            <USelect
                v-model="currentAppId"
                :options="appIds"
                option-attribute="name"
                size="md"
            />
        </app-input-wrapper>
    </app-page>
</template>
<script setup>
import { ipcRenderer } from "electron";
const discordAppIds = ipcRenderer.sendSync("get-discord-app-ids");
const appIds = Object.keys(discordAppIds).map((key) => ({
    value: key,
    name: discordAppIds[key],
}));
const config = ipcRenderer.sendSync("read-config");
console.log(config);
const currentAppId = ref(config.discordAppName);
watch(currentAppId, (value) => {
    ipcRenderer.send("update-config", {
        ...config,
        discordAppName: value,
    });
});
</script>
