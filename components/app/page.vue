<template>
    <div class="app-page">
        <div class="title">
            {{ title }}
        </div>
        <div class="content">
            <slot />
        </div>
    </div>
</template>
<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
});
</script>
<style lang="scss" scoped>
.app-page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    flex-grow: 1;
    background-color: $secondary-bg;
    margin: 10px;
    border-radius: 10px;
    .title {
        font-size: 25px;
        font-weight: 600;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
    }
}
</style>
