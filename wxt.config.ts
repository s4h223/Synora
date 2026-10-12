import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
    // Keep the real icon in dev builds; the grayscale default looks like a disabled extension.
    developmentIndicator: false,
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Synora',
    description: 'Think better. Code smarter. An AI learning companion for LeetCode.',
    // Permissions are deliberately minimal. Provider hosts are requested at runtime
    // (optional_host_permissions) only when the user configures that provider.
    permissions: ['sidePanel', 'storage'],
    action: {
      default_title: 'Open Synora',
    },
  },
});
