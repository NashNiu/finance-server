// Vercel serverless entry for the NestJS API.
//
// A single function; vercel.json rewrites all /api/* requests here (Vercel
// preserves the original req.url through the rewrite, so NestJS's /api global
// prefix still matches at any path depth).
//
// It requires the tsc-compiled output in ../dist (produced by `nest build`
// during the Vercel build step) rather than the TypeScript source, so NestJS's
// emitted decorator metadata is preserved (Vercel's esbuild bundling would
// otherwise drop it and break dependency injection).
//
// The Nest app is created once per warm instance and reused across invocations.
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');
const { AppModule } = require('../dist/src/app.module');
const { configureApp } = require('../dist/src/app-setup');

const server = express();
let ready;

async function init() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });
  configureApp(app);
  await app.init();
}

module.exports = async (req, res) => {
  if (!ready) ready = init();
  await ready;
  server(req, res);
};
