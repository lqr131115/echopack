/**
 * 由子进程开启此服务
 */

const detectPort = require('detect-port');
const inquirer = require('inquirer');
const Service = require('../service/Service');
const log = require('../utils/log');
; (async function () {
    const DEFAULT_PORT = 8080
    const params = process.argv.slice(2)
    const paramsObj = {}
    params.forEach(param => {
        const [key, val] = param.split(' ')
        const _key = key.replace('--', '')
        paramsObj[_key] = val
    });
    const port = +paramsObj['port'] || DEFAULT_PORT
    try {
        const newPort = await detectPort(port)
        if (newPort !== port) {
            const question = {
                type: 'confirm',
                name: 'answer',
                message: `端口号${port}已占用,使用新端口号?`
            }
            const { answer } = await inquirer.prompt(question)
            if (!answer) {
                process.exit(1)
            }
            process.env.NODE_ENV = 'development'
        }
        const { config, customWebpackPath, stop } = paramsObj
        const args = {
            port: newPort,
            config,
            customWebpackPath,
            stop: stop === 'true',
        }
        const service = new Service('start', args)
        await service.start()
    } catch (e) {
        log.error('devService', e.message);
    }
})();