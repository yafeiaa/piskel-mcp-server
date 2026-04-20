#!/usr/bin/env node
/**
 * Piskel MCP Server - Pixel art creation through MCP protocol.
 *
 * This file is part of Piskel MCP Server.
 * Based on Piskel (https://github.com/piskelapp/piskel)
 * Original code Copyright (C) 2011-2016 Julian Descottes
 * Licensed under Apache License 2.0
 *
 * Modifications: Converted to TypeScript MCP Server.
 */

import { PiskelServer } from './server/index.js';

async function main(): Promise<void> {
  const server = new PiskelServer();
  const transport = process.env.TRANSPORT || 'stdio';

  if (transport === 'http') {
    const port = parseInt(process.env.PORT || '3000', 10);
    await server.runHTTP(port);
  } else {
    await server.run();
  }
  
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
