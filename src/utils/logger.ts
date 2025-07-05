/**
 * Logging utility for SVCMS Synaptic MCP Server
 */

import chalk from 'chalk';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

class SvcmsLogger implements Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.log(
        chalk.gray(`[${this.getTimestamp()}]`),
        chalk.cyan('[DEBUG]'),
        message,
        ...args
      );
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(
      chalk.gray(`[${this.getTimestamp()}]`),
      chalk.blue('[INFO]'),
      message,
      ...args
    );
  }

  warn(message: string, ...args: any[]): void {
    console.warn(
      chalk.gray(`[${this.getTimestamp()}]`),
      chalk.yellow('[WARN]'),
      message,
      ...args
    );
  }

  error(message: string, ...args: any[]): void {
    console.error(
      chalk.gray(`[${this.getTimestamp()}]`),
      chalk.red('[ERROR]'),
      message,
      ...args
    );
  }
}

export const logger = new SvcmsLogger();