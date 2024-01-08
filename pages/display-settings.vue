<template>
    <app-page title="Настройки отображения">
        <app-input-wrapper label="Отображаемое приложение">
            <USelect
                v-model="configProxy.discordAppName"
                :options="appIds"
                option-attribute="name"
                size="md"
            />
        </app-input-wrapper>
        <app-input-wrapper label="Кнопка">
            <USelect
                v-model="configProxy.button"
                :options="[
                    { value: 'track', name: 'Ссылка на трек' },
                    { value: 'profile', name: 'Ссылка на профиль last.fm' },
                    { value: 'off', name: 'Cкрыть' },
                ]"
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

const configProxy = reactive(config);
watch(configProxy, (value) => {
    ipcRenderer.send("update-config", { ...value });
});
</script>
