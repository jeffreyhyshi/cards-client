import { defineConfig, Plugin, ResolvedConfig } from 'vite';
import { AssetPack, AssetPackConfig } from '@assetpack/core';
import { msdfFont, sdfFont } from '@assetpack/core/webfont';
import { pixiPipes } from "@assetpack/core/pixi";
import path from 'path'

function assetpackPlugin() {
  const apConfig = {
    entry: './raw_assets',
    pipes: [
      ...pixiPipes({
        cacheBust: false,
        manifest: {
          output: "./src/manifest.json",
        },
        compression: {
          jpg: false,
          webp: false,
          png: true
        }
      })
    ]
  };
  let mode;
  let ap;
  return {
    name: 'vite-plugin-assetpack',
    configResolved(resolvedConfig) {
      mode = resolvedConfig.command;
      if (!resolvedConfig.publicDir) return;
      if (apConfig.output) return;
      const publicDir = resolvedConfig.publicDir.replace(process.cwd(), '');
      apConfig.output = `.${publicDir}/assets/`;
    },
    buildStart: async() => {
      if (mode === 'serve') {
          if (ap) return;
          ap = new AssetPack(apConfig);
          void ap.watch();
      } else {
          await new AssetPack(apConfig).run();
      }
    },
    buildEnd: async () => {
        if (ap) {
            await ap.stop();
            ap = undefined;
        }
    }
  }
}

export default defineConfig ({
  // config options
  base: '/cards-client',
  plugins: [
    assetpackPlugin(),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: true,
    minify: 'oxc',
    assetsDir: 'assets',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]' // Hashing for cache busting
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"' // Inject environment variables
  }
});