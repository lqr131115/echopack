const path = require('path')
const chokidar = require('chokidar');
const cp = require('child_process')
const log = require('../utils/log')
const { getConfigFilePath } = require('../utils')

let child;
function runServer(args = {}) {
    const { config = '', customWebpackPath = '', stop } = args
    const pat = path.resolve(__dirname, './devService.js')

    // TODO: 直接传入args??
    child = cp.fork(pat, [
        '--port 8080',
        '--config ' + config,
        '--customWebpackPath ' + customWebpackPath,
        "--stop " + stop
    ])

    // 监听子进程是否退出
    child.on('exit', code => {
        // 若非正常退出,主进程也同步退出
        if (code) {
            log.error('子进程非正常退出')
            process.exit(code)
        }
    })
}


function runWatch() {
    const configPath = getConfigFilePath()
    chokidar.watch(configPath).on('change', onChange)
}

function onChange(path, stats) {
    log.verbose('onchange', 'config file changed!')
    child.kill()
    runServer()
}

module.exports = function startServer(args, cmd) {
    /**
     * 子进程启动webpack-dev-server服务
     */
    runServer(args)
    /**
     * 监听配置修改
     */
    runWatch()
}