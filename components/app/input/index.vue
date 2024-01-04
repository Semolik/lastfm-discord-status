<template>
    <app-input-wrapper :label="label">
        <UInput
            v-bind="$attrs"
            size="md"
            variant="outline"
            :ui="{ icon: { trailing: { pointer: '' } } }"
        >
            <template v-for="(_, slot) of $slots" v-slot:[slot]="scope"
                ><slot :name="slot" v-bind="scope"
            /></template>
        </UInput>
        <template #after>
            <slot name="after" />
        </template>
    </app-input-wrapper>
</template>
<script setup>
defineProps({
    label: {
        type: String,
        required: true,
    },
});
</script>
