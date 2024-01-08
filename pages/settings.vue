<template>
    <app-page title="Настройки приложения">
        <UCheckbox
            label="Запускать приложение при старте"
            v-model="runOnStartup"
        />
    </app-page>
</template>
<script setup>
import { ipcRenderer } from "electron";
const config = ipcRenderer.sendSync("read-config");
const runOnStartup = ref(config.runOnStartup);
watch(runOnStartup, (value) => {
    ipcRenderer.send("update-config", { ...config, runOnStartup: value });
});
</script>
