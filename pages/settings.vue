<template>
    <app-page title="Настройки приложения">
        <UCheckbox
            label="Запускать приложение при старте"
            v-model="startupConfig.runOnStartup"
        />
        <UCheckbox
            label="Запускать свернутым"
            v-model="startupConfig.runInBackground"
            :disabled="!startupConfig.runOnStartup"
        />
    </app-page>
</template>
<script setup>
import { ipcRenderer } from "electron";
const startupConfig = reactive(ipcRenderer.sendSync("get-startup-config"));
console.log(startupConfig);
watch(startupConfig, (value) => {
    ipcRenderer.send("set-startup-config", {
        status: value.runOnStartup,
        runInBackground: value.runInBackground,
    });
    startupConfig.runOnStartup = value.runOnStartup;
    startupConfig.runInBackground = value.runOnStartup && value.runInBackground;
});
</script>
