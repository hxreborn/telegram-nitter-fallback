# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot that automatically converts Twitter/X links to Nitter links. When users post Twitter/X links in Telegram chats, the bot detects them and replies with corresponding Nitter instance links for privacy-focused viewing.

## Architecture

The project consists of a single TypeScript file (`index.ts`) using the Telegraf framework for Telegram bot functionality. The bot:

1. Loads Nitter instances from environment variables on startup
2. Listens for messages containing Twitter/X links (supports `twitter.com` and `x.com` domains)
3. Extracts Twitter/X URLs from text messages, captions, and text links using Telegram entities
4. Checks instance health before selecting (with caching to avoid excessive requests)
5. Randomly selects a healthy Nitter instance for each link
6. Replaces the Twitter/X domain with the Nitter domain while preserving the path
7. Replies to the original message with the converted Nitter links

Key architectural decisions:
- Uses regex pattern `/^(\w+:\/\/)?(?:mobile\.)?(twitter\.com|x\.com)\b/i` to match Twitter/X links
- Processes both explicit URLs and Telegram text_link entities
- Handles media messages (audio, photo, video, document) by checking caption entities
- Supports both webhook and long-polling modes for receiving updates
- **Health checking**: Before using an instance, sends a HEAD request with 5s timeout to verify it's online
- **Health caching**: Caches instance health status for 5 minutes to reduce overhead
- **Graceful degradation**: If all instances are down, notifies the user instead of failing silently

## Commands

### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript using `tsc index.ts`

### Start
```bash
npm start
```
Runs the compiled bot (requires `npm run build` first)

### Install dependencies
```bash
npm install
```

## Environment Configuration

The bot requires a `.env` file (copy from `.env.example`) with:

- `TELEGRAM_BOT_TOKEN`: Required - Your Telegram bot token from BotFather
- `NITTER_INSTANCES`: Required - Space-separated list of Nitter instance URLs
- `DISABLE_WEBHOOK`: Set to `true` for long-polling mode, omit or set to `false` for webhook mode
- `WEBHOOK_DOMAIN`, `WEBHOOK_PORT`, `WEBHOOK_PATH`: Optional - Only needed when using webhook mode

**Important**: Privacy mode must be disabled in BotFather for the bot to read messages in groups.

## Bot Commands

- `/show_nitter_instances` - Displays all configured Nitter instances

## Technical Details

- **Node version**: ^16 (specified in package.json)
- **TypeScript target**: ES5 with CommonJS modules
- **Main dependencies**: telegraf (Telegram bot framework), dotenv (environment variables), node-fetch (HTTP requests)
- The bot processes message entities to properly handle both plain URLs and formatted text links
- **Health check configuration**:
  - `HEALTH_CHECK_TTL`: 5 minutes (300,000ms) - How long to cache health status
  - `HEALTH_CHECK_TIMEOUT`: 5 seconds (5,000ms) - Maximum time to wait for instance response
  - Health checks use HTTP HEAD requests to minimize bandwidth
