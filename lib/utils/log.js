const npmlog = require('npmlog')
const LOG_LEVELS = [
    'verbose',
    'info',
    'warn',
    'error',
]
const LOG_LEVEL = ~LOG_LEVELS.indexOf(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : 'info'
npmlog.level = LOG_LEVEL
module.exports = npmlog