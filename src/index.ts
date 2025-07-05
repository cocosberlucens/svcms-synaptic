#!/usr/bin/env node

/**
 * SVCMS Synaptic MCP Server
 * 
 * Git-embedded memory system with semantic diff awareness.
 * Transforms semantic commits into queryable knowledge through MCP.
 * 
 * @author Corrado Berlucchi & Claude
 */

import { SvcmsMcpServer } from './mcp/server.js';
import { ConfigLoader } from './config/loader.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  try {
    logger.info('🧠 Starting SVCMS Synaptic MCP Server...');
    
    // Load layered configuration (global + project)
    const config = await ConfigLoader.load();
    logger.debug('Configuration loaded:', config);
    
    // Initialize and start MCP server
    const server = new SvcmsMcpServer(config);
    await server.start();
    
    logger.info('✅ SVCMS Synaptic MCP Server running');
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('🛑 Received SIGTERM, shutting down...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('❌ Failed to start SVCMS Synaptic MCP Server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  logger.error('Fatal error in main:', error);
  process.exit(1);
});