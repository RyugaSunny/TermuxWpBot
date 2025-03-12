# WhatsApp Sticker Bot

A lightweight WhatsApp bot built with Baileys to create stickers from images, GIFs, and videos. Supports multi-device authentication with session persistence—no QR scans after the first run!

## Features

- Convert images, GIFs, and videos to stickers with `.sticker` or `.s`.
- Transparent backgrounds for all stickers.
- Check bot status with `.status` (replies "Yes I am wide awake!").
- Session persistence in `auth_info` folder.
- File size limit: Stickers over 1MB are rejected with a custom message.

## Requirements

- Node.js (v16+ recommended)
- Git
- FFmpeg (for media processing)

## Setup and Installation

### For Termux (Android)

#### Install dependencies:

```sh
pkg update && pkg upgrade -y
pkg install nodejs git ffmpeg -y
```

#### Clone the repository:

```sh
git clone https://github.com/RyugaSunny/TermuxWpBot.git
cd TermuxWpBot
```

#### Install Node.js packages:

```sh
npm install @whiskeysockets/baileys @hapi/boom pino qrcode fluent-ffmpeg
```

#### Run the bot:

```sh
node bot.js
```

- Scan the QR code with WhatsApp (Settings > Linked Devices > Link a Device).
- Session is saved in `auth_info` — no QR needed for future runs.

#### Run 24/7 (optional):

```sh
pkg install tmux -y
tmux
node bot.js
```

- Press `Ctrl + B`, then `D` to detach. Reattach with `tmux attach`.

### For Linux (e.g., Ubuntu)

#### Install dependencies:

```sh
sudo apt update && sudo apt install nodejs git ffmpeg -y
```

#### Clone the repository:

```sh
git clone https://github.com/RyugaSunny/TermuxWpBot.git
cd TermuxWpBot
```

#### Install Node.js packages:

```sh
npm install @whiskeysockets/baileys @hapi/boom pino qrcode fluent-ffmpeg
```

#### Run the bot:

```sh
node bot.js
```

- Scan the QR code. Session persists in `auth_info`.

## Usage

- Send `.sticker` or `.s` with an image, GIF, or video to create a sticker.
- Send `.status` to check if the bot is running.

## Notes

- Stickers over 1MB will fail with a message: `"File too large! Sticker must be under 1MB and yours is {size}KB."` , Because Whatsapp don't allow stickers over 1MB.
- Temporary files (`temp-sticker-*.webp`) are deleted after processing.
- Quality is set to maximum for static images (`-lossless 1`) and high for animations (`-b:v 500k`).

## Credits

- Built with [Baileys](https://github.com/WhiskeySockets/Baileys).
- Created by **Deepanshu**.

