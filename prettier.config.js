/** @type {import("prettier").Config} */
const config = {
    useTabs: false,
    tabWidth: 4,
    singleQuote: true,
    trailingComma: 'none',
    semi: false,
    printWidth: 100,
    plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-svelte'],
    overrides: [
        {
            files: '**/*.svelte',
            options: {
                parser: 'svelte'
            }
        },
        {
            files: '**/*.ts',
            options: {
                parser: 'typescript'
            }
        }
    ]
}

export default config
