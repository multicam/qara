import indexHtml from "./index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": indexHtml,
    "/data.json": {
      GET: () => new Response(Bun.file('./data.json'))
    }
  },
  development: {
    hmr: true,
    console: true,
  }
});

console.log('🚀 Finance Charts running at http://localhost:3000');
