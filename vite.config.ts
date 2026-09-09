import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        field: "field.html",
        machine: "machine.html",
        unnamed: "unnamed.html",
        want: "want.html",
        behind: "behind.html",
        play: "play.html",
        you: "you.html",
      },
    },
  },
});
