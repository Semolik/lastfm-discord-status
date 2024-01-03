<template>
    <div class="app">
        <app-aside />
        <nuxt-page />
    </div>
</template>
<script setup>
import { onMounted } from "vue";
import { ipcRenderer } from "electron";
onMounted(() => {
    const apiKey = localStorage.getItem("lastfm-api-key");
    const username = localStorage.getItem("lastfm-username");
    if (!apiKey || !username) return;
    ipcRenderer.send("app-ready", {
        apiKey: apiKey,
        username: apiKey,
    });
});
</script>
<style lang="scss" scoped>
.app {
    display: flex;
    height: 100%;
}
</style>
