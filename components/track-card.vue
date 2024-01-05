<template>
    <div class="discord-rpc">
        <div class="card-info-container">
            <UTooltip
                :text="track.largeImageText"
                :popper="{ placement: 'top' }"
            >
                <img :src="track.largeImageKey" alt="Обложка трека" />
            </UTooltip>
            <div class="card-info">
                <div class="app-name">
                    {{ discordAppIds[config.discordAppName] }}
                </div>
                <div class="app-details">
                    {{ track.details }}
                </div>
                <div class="app-state">
                    {{ track.state }}
                </div>
            </div>
        </div>
        <a
            class="button"
            :href="track.buttons[0].url"
            v-if="track.buttons"
            target="_blank"
            >Открыть</a
        >
    </div>
</template>
<script setup>
import { ipcRenderer } from "electron";
const props = defineProps({
    track: {
        type: Object,
        required: true,
    },
});
const { track } = toRefs(props);
const config = ipcRenderer.sendSync("read-config");
const discordAppIds = ipcRenderer.sendSync("get-discord-app-ids");
</script>
<style lang="scss" scoped>
.discord-rpc {
    background-color: $tertiary-bg;
    padding: 10px;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 350px;
    .card-info-container {
        display: flex;
        gap: 10px;
        img {
            min-width: 90px;
            width: 90px;
            height: 90px;
            min-height: 90px;
            object-fit: cover;
            border-radius: 5px;
            background-color: $quaternary-bg;
        }

        .card-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            font-size: 14px;
            flex-grow: 1;

            .app-name {
                font-weight: bold;
            }
        }
    }
    .button {
        background-color: $quinary-bg;
        padding: 5px;
        grid-column: 1 / 3;
        border-radius: 5px;
        text-align: center;
        cursor: pointer;

        &:hover {
            background-color: $senary-bg;
        }
    }
}
</style>
