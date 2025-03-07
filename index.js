const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const qrcode = require('qrcode');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs'); // Added for file operations

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('\x1b[32m✔ Connected to WhatsApp!\x1b[0m');
        } else if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('\x1b[31m✖ Logged out. Please scan QR again.\x1b[0m');
            } else {
                console.log('\x1b[33m⚠ Disconnected. Reconnecting...\x1b[0m');
                startBot();
            }
        }
        if (update.qr) {
            console.log('\x1b[36m🔍 QR Code generated. Scan it with WhatsApp:\x1b[0m');
            qrcode.toString(update.qr, { type: 'terminal', small: true }, (err, qr) => {
                if (err) console.error('\x1b[31m✖ Error generating QR:', err, '\x1b[0m');
                else console.log(qr);
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid.split('@')[0];
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
        
        console.log(`\x1b[34m📩 Message Received - From: ${sender} | Content: "${text}"\x1b[0m`);

        if (text === '.status') {
            await sock.sendMessage(msg.key.remoteJid, {
                text: 'Yes I am wide awake!'
            });
            console.log(`\x1b[32m📤 Message Sent - To: ${sender} | Content: "Yes I am wide awake!"\x1b[0m`);
        }

        if (text === '.sticker' || text === '.s') {
            const hasImage = msg.message.imageMessage || (msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);
            const hasVideo = msg.message.videoMessage || (msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage);

            if (hasImage || hasVideo) {
                try {
                    console.log(`\x1b[36m🔄 Converting media to sticker for ${sender}...\x1b[0m`);
                    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: P({ level: 'silent' }) });

                    let stickerBuffer;
                    const isAnimated = hasVideo && (msg.message.videoMessage?.mimetype.includes('gif') || msg.message.videoMessage?.mimetype.includes('video') || msg.message.videoMessage?.gifPlayback);
                    const outputPath = `./temp-sticker-${Date.now()}.webp`;

                    stickerBuffer = await new Promise((resolve, reject) => {
                        const inputStream = require('stream').Readable.from(buffer);
                        ffmpeg(inputStream)
                            .size('512x512')
                            .outputOptions([
                                '-vf scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:0x00000000', // Transparent background
                                ...(isAnimated ? ['-loop', '0'] : ['-frames:v', '1']), // Loop for animations, single frame for images
                                '-c:v', 'webp',
                                '-q:v', '20',
                                '-b:v', '200k',
                                '-pix_fmt', 'yuva420p'
                            ])
                            .toFormat('webp')
                            .on('end', () => resolve(fs.readFileSync(outputPath)))
                            .on('error', (err) => reject(err))
                            .save(outputPath);
                    });
                    fs.unlinkSync(outputPath);

                    console.log(`\x1b[36mℹ Sticker processed - New buffer size: ${(stickerBuffer.length / 1024).toFixed(2)} KB\x1b[0m`);
                    if (stickerBuffer.length > 1153434) { // 1.1MB in bytes
                        const sizeInKB = (stickerBuffer.length / 1024).toFixed(2);
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: `File too large! Sticker must be under 1MB and yours is ${sizeInKB}KB.`
                        });
                        console.log(`\x1b[33m📤 Size Error Sent - To: ${sender} | Content: "File too large! Sticker must be under 1MB and yours is ${sizeInKB}KB."\x1b[0m`);
                        return;
                    }

                    await sock.sendMessage(msg.key.remoteJid, {
                        sticker: stickerBuffer,
                        mimetype: 'image/webp',
                        isAnimated: isAnimated
                    });
                    console.log(`\x1b[32m🎉 Sticker Converted and Sent - To: ${sender} ${isAnimated ? '(Animated)' : ''} | Size: ${(stickerBuffer.length / 1024).toFixed(2)} KB\x1b[0m`);
                } catch (error) {
                    console.error(`\x1b[31m✖ Error converting sticker for ${sender}:`, error, '\x1b[0m');
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: 'Error creating sticker. Try again! (File might be unsupported)'
                    });
                    console.log(`\x1b[33m📤 Error Message Sent - To: ${sender} | Content: "Error creating sticker. Try again! (File might be unsupported)"\x1b[0m`);
                }
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: 'Please send an image, GIF, or video with .sticker or .s to convert it!'
                });
                console.log(`\x1b[33m📤 Info Sent - To: ${sender} | Content: "Please send an image, GIF, or video with .sticker or .s to convert it!"\x1b[0m`);
            }
        }
    });
}

startBot().catch((err) => console.error('\x1b[31m✖ Error starting bot:', err, '\x1b[0m'));