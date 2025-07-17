## general guides

- keep the code clean and readable
- DRY
- make your modification minimal when receive instruction from the user
- use `pnpm`
- keep a dev journal inside `dev-journal` folder as you work on the project
- use `typescript`
- use `type` over `interface` where possible
- use `kebab-case` for file names
- use `snake_case` for variables and functions
- we use tailwind v4, no need for `tailwind.config.js` file
- use daisyUI v5 for styling

## guides for svelte

- use this template to instantiate new `.svelte` components

```svelte
<script lang="ts">
</script>

<style lang="postcss">
</style>
```

- use svelte5 runes, but stay with writable and readable stores where appropriate
- in svelte component, no need to copy stores into `$state`, just use `$store` directly
- use `tailwindcss` for styling where appropriate, and css in `<style>` tags is still fine when needed
    - prefer to use tailwind classes in the markup. when you write style in `<style>` tag, use normal CSS syntax, not tailwind syntax. if you do need to use tailwind in `<style>` tag, use `@reference "tailwindcss";` at the beginning of the file(only if u used tailwindcss in `<style>` tag.
- `#each` item should have a key using syntax `{#each list as item (key)}`
