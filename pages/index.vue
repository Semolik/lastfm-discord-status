<template>
    <app-page title="Настройки last.fm">
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
            label="Имя пользователя на last.fm"
            v-model="usernameTemp"
        />

        <UButton
            :color="dataChanged ? 'green' : 'gray'"
            :disabled="!dataChanged"
            size="md"
            class="mt-auto w-min"
            @click="saveData"
        >
            Сохранить
        </UButton>
    </app-page>
</template>

<script setup>
import { ipcRenderer } from "electron";
const hideApiKey = ref(true);
const credentials = ipcRenderer.sendSync("read-credentials");
const apiKey = ref(credentials.apiKey);
const username = ref(credentials.username);
const apiKeyTemp = ref(apiKey.value);
const usernameTemp = ref(username.value);

const dataChanged = computed(
    () =>
        apiKeyTemp.value !== apiKey.value ||
        usernameTemp.value !== username.value
);
const saveData = () => {
    if (!dataChanged.value) return;
    apiKey.value = apiKeyTemp.value;
    username.value = usernameTemp.value;
    usernameErrored.value = false;
    apiKeyErrored.value = false;
    ipcRenderer.send("update-credentials", {
        apiKey: apiKey.value,
        username: username.value,
    });
};
</script>
