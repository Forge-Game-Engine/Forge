"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prism_react_renderer_1 = require("prism-react-renderer");
// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
var config = {
    title: 'Forge',
    tagline: "Forge is a browser-based, code only game engine. It has everything you'd expect from an engine, including rendering, audio, input, animations, ECS, etc.",
    favicon: 'img/forge-logo.ico',
    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },
    // Set the production url of your site here
    url: 'https://forge-game-engine.github.io',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/Forge/',
    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'Forge-Game-Engine', // Usually your GitHub org/user name.
    projectName: 'Forge', // Usually your repo name.
    deploymentBranch: 'gh-pages',
    trailingSlash: false,
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },
    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: './sidebars.ts',
                },
                theme: {
                    customCss: './src/css/custom.css',
                },
            },
        ],
    ],
    plugins: [
        [
            'docusaurus-plugin-typedoc',
            {
                id: 'api',
                entryPoints: ['../src/index.ts'],
                tsconfig: '../tsconfig.json',
                readme: 'none',
                name: 'API',
            },
        ],
    ],
    scripts: [
        {
            src: 'https://kit.fontawesome.com/ff0f4a1036.js',
            crossorigin: 'anonymous',
        },
    ],
    themeConfig: {
        // Replace with your project's social card
        image: 'img/docusaurus-social-card.jpg',
        colorMode: {
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: 'Forge',
            logo: {
                alt: 'Forge Logo',
                src: 'img/forge-logo.png',
            },
            items: [
                {
                    to: '/docs/category/documentation',
                    label: 'Documentation',
                    position: 'left',
                },
                { to: '/docs/api', label: 'API', position: 'left' },
                {
                    type: 'dropdown',
                    label: 'Demos',
                    position: 'left',
                    items: [
                        {
                            to: 'demos/space-shooter',
                            label: 'Space Shooter',
                        },
                    ],
                },
                {
                    href: 'https://github.com/Forge-Game-Engine/Forge',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Documentation',
                    items: [
                        {
                            label: 'Tutorial',
                            to: '/docs/intro',
                        },
                    ],
                },
                {
                    title: 'Legal',
                    items: [{ label: 'Credits and attributions', to: '/docs/credits' }],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'GitHub',
                            href: 'https://github.com/Forge-Game-Engine/Forge',
                        },
                    ],
                },
            ],
        },
        prism: {
            theme: prism_react_renderer_1.themes.oneLight,
            darkTheme: prism_react_renderer_1.themes.vsDark,
            magicComments: [
                {
                    className: 'theme-code-block-highlighted-line',
                    line: 'highlight-next-line',
                    block: { start: 'highlight-start', end: 'highlight-end' },
                },
                {
                    className: 'code-block-removed-line',
                    line: 'diff-remove',
                    block: { start: 'diff-remove-start', end: 'diff-remove-end' },
                },
                {
                    className: 'code-block-added-line',
                    line: 'diff-add',
                    block: { start: 'diff-add-start', end: 'diff-add-end' },
                },
            ],
        },
        tableOfContents: {
            minHeadingLevel: 2,
            maxHeadingLevel: 4,
        },
    },
};
exports.default = config;
