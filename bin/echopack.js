#!/usr/bin/env node

checkDebug();

const { Command } = require('commander');
const program = new Command()
const checkNodeVersion = require('../lib/checkNode')
const startServer = require('../lib/start/startServer')
const build = require('../lib/build/build')
const pkg = require('../package.json');
const log = require('../lib/utils/log')

const MIN_NODE_VERSION = '8.9.0';
function checkDebug() {
    const args = process.argv.slice(2)
    if (~args.indexOf('--d') || ~args.indexOf('--debug')) {
        process.env.LOG_LEVEL = 'verbose'

    } else {
        process.env.LOG_LEVEL = 'info'
    }
};

; (async () => {
    try {
        if (!checkNodeVersion(MIN_NODE_VERSION)) {
            throw new Error('Node version must >=' + MIN_NODE_VERSION)
        }

        program.version = pkg.version
        // global option
        program
            .option('-d, --debug', '开启调试模式')

        // .hook('preAction', (thisCommand, _) => {
        //     const debug = thisCommand.getOptionValue('debug')
        //     if (debug) {
        //         process.env.LOG_LEVEL = 'verbose'
        //     } else {
        //         process.env.LOG_LEVEL = 'info'
        //     }
        // })

        program
            .command('start')
            .option('-s, --stop', '停止启动服务', false)
            .option('-c, --config <config>', '配置文件路径')
            .option('--custom-webpack-path <customWebpackPath>', '自定义webpack路径,例如D:/other/node_module/webpack')
            .description('start server by echopack')
            .allowUnknownOption()
            .action(startServer)

        program
            .command('build')
            .option('-c, --config <config>', '配置文件路径')
            .description('build echopack project')
            .allowUnknownOption()
            .action(build)

        program.parse(process.argv)
    } catch (e) {
        log.error('echopack', e.message);
    }
})();