<template>
    <app-page title="Настройки приложения">
        <UCheckbox
            label="Запускать приложение при старте"
            v-model="config.runOnStartup"
        />
        <UCheckbox
            label="Запускать свернутым"
            v-model="config.runAsBackground"
            :disabled="!config.runOnStartup"
        />
    </app-page>
</template>
<script setup>
import { ipcRenderer } from "electron";

const config = reactive(ipcRenderer.sendSync("read-config"));
watch(config, (value) => {
    config.runAsBackground = value.runOnStartup ? value.runAsBackground : false;
    if (value.runAsBackground !== config.runAsBackground) return;
    ipcRenderer.send("update-config", { ...value });
});
</script>
