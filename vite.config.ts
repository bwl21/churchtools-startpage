import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import eslintPlugin from 'vite-plugin-eslint';
import path from 'path';

// https://vitejs.dev/config/
export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    return defineConfig({
        base: `/ccm/${process.env.VITE_KEY}/`,
        plugins: [
            vue(), 
            eslintPlugin(), 
            tailwindcss()
        ],
        resolve: {
            dedupe: ['vue'],
            alias: {
                // Fix ChurchTools styleguide config reference
                '../../tailwind.config.mjs': path.resolve(__dirname, './tailwind.config.mjs')
            }
        },
        server: {
            host: '127.0.0.1',
            port: 5173,
        },
        build: {
            target: 'es2022',
            cssMinify: 'esbuild'
        },

    });
};
