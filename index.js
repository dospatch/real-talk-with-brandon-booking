// Root entry point for hosting panels that start /home/container/index.js.
// The actual bot implementation remains in discord-bot/src/index.js.
require('dotenv').config();
require('./discord-bot/src/index.js');
