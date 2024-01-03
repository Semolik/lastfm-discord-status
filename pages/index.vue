<template>
    <app-page title="Last.fm settings">
        <app-input
            placeholder="API key"
            label="API key"
            v-model="apiKeyTemp"
            :type="hideApiKey ? 'password' : 'text'"
        >
            <template #trailing>
                <UButton
                    color="gray"
                    variant="link"
                    :icon="
                        hideApiKey ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'
                    "
                    :padded="false"
                    @click="hideApiKey = !hideApiKey"
                />
            </template>
            <template #after>
                <UButton
                    color="gray"
                    icon="i-heroicons-question-mark-circle"
                    to="https://www.last.fm/api/account/create"
                    target="_blank"
                />
            </template>
        </app-input>
        <app-input
            placeholder="last.fm/user/your_name_here"
            label="Last.fm nickname"
            v-model="nicknameTemp"
        />

        <UButton
            :color="dataChanged ? 'green' : 'gray'"
            :disabled="!dataChanged"
            size="md"
            class="mt-auto"
            @click="saveData"
        >
            Сохранить
        </UButton>
    </app-page>
</template>

<script setup>
import { onMounted } from "vue";
import { ipcRenderer } from "electron";
import fs from "node:fs";
const hideApiKey = ref(true);
const apiKey = useLocalStorage("lastfm-api-key", "");
const nickname = useLocalStorage("lastfm-nickname", "");
const apiKeyTemp = ref(apiKey.value);
const nicknameTemp = ref(nickname.value);
const dataChanged = computed(
    () =>
        apiKeyTemp.value !== apiKey.value ||
        nicknameTemp.value !== nickname.value
);
const saveData = () => {
    if (!dataChanged.value) return;
    apiKey.value = apiKeyTemp.value;
    nickname.value = nicknameTemp.value;
};
onMounted(() => {
    console.log("ipcRenderer:", ipcRenderer);
    console.log("fs:", fs);
});
</script>
