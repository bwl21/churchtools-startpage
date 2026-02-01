import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { createPinia } from 'pinia';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { router } from './router';
import { ctUtils } from '@churchtools/utils';
import { ctPlugin, ctStyleguide } from '@churchtools/styleguide';
import { VueQueryPlugin } from '@tanstack/vue-query';

import './tailwind.css';
import '@churchtools/styleguide/style';
import './assets/fontawesome/css/all.css';

declare const window: Window &
    typeof globalThis & {
        settings: {
            base_url?: string;
            language?: string;
        };
        tx: (key: string) => string;
        t: (key?: string, ...args: unknown[]) => string;
        i18n: (key?: string, ...args: unknown[]) => string;
        escapeHtmlMD: (text: string) => string;
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

const app = createApp(App);
const pinia = createPinia();

if (import.meta.env.MODE === 'development') {
    window.tx = (e: string) => e;
    window.t = (e?: string, ..._args: unknown[]) => e || '';
    window.i18n = (e?: string, ..._args: unknown[]) => e || '';
    window.escapeHtmlMD = (e: string) => e;
    window.settings = {
        language: 'de',
    };
}

app.use(ctUtils, {
    baseUrl,
    pinia,
    t: window.t ?? ((e?: string) => e || ''),
});
app.use(ctStyleguide, {
    baseUrl,
    t: window.t ?? ((e?: string) => e || ''),
});
app.use(ctPlugin);

app.mixin({
    methods: {
        t: function (key?: string, ..._args: unknown[]) {
            return window.t(key, ..._args);
        },
        tx: function (key: string) {
            return key;
        },
        escapeHtmlRelaxed(string: string) {
            return string;
        },
        escapeHtml(string: string) {
            return string;
        },
    },
});

app.use(VueQueryPlugin);
app.use(pinia);
app.use(router);
app.mount('#app');

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;
if (import.meta.env.MODE === 'development' && username && password) {
    await churchtoolsClient.post('/login', { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };
