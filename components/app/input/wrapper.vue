<template>
    <div class="input">
        <div class="label">{{ label }}</div>
        <div class="input-container">
            <slot />
            <slot name="after" />
        </div>
    </div>
</template>
<script setup>
defineProps({
    label: {
        type: String,
        required: true,
    },
});
</script>
<style lang="scss" scoped>
.input {
    display: flex;
    flex-direction: column;
    gap: 5px;
    .label {
        font-size: 14px;
    }
    .input-container {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 5px;
    }
}
</style>
