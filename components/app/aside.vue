<template>
    <aside>
        <div class="links">
            <UChip
                class="flex"
                :show="usernameErrored || apiKeyErrored"
                color="red"
            >
                <nuxt-link to="/" class="grow">
                    <Icon name="mdi:lastfm" />
                    <span>Настройки last.fm</span>
                </nuxt-link>
            </UChip>

            <nuxt-link to="/display-settings">
                <Icon name="material-symbols:settings" />
                <span> Настройки отображения </span>
            </nuxt-link>
            <nuxt-link to="/rich-presence">
                <Icon name="material-symbols:newspaper-rounded" />
                <span> Discord Rich Presence </span>
            </nuxt-link>
        </div>
    </aside>
</template>
<style lang="scss" scoped>
aside {
    min-width: 250px;
    background-color: $secondary-bg;
    padding: 20px 10px;
    display: flex;
    gap: 20px;
    flex-direction: column;

    .links {
        display: flex;
        flex-direction: column;
        gap: 10px;
        a {
            display: flex;
            align-items: center;
            gap: 10px;
            color: $secondary-text;
            text-decoration: none;

            padding: 10px;
            border-radius: 5px;

            &.router-link-exact-active {
                background-color: $quaternary-bg;
            }

            &:not(.router-link-exact-active):hover {
                background-color: $tertiary-bg;
            }

            span {
                font-size: 15px;
            }

            svg {
                width: 20px;
                height: 20px;
            }
        }
    }
}
</style>
