
const path = require('path')
const fs = require('fs')
const fg = require('fast-glob')
const { pathToFileURL } = require('url')
const log = require('../utils/log')
const DEFAULT_CONFIG_PATH = ['echopack.(mjs|js|json)']

function getConfigFilePath(cwd = process.cwd()) {
    const [defaultConfigFilePath] = fg.sync(DEFAULT_CONFIG_PATH, {
        cwd,
        absolute: true
    })
    return defaultConfigFilePath
}

async function loadMoudle(modulePath) {
    let mPath;

    // TODO: 暂时简单认为. 或 / 开头的为自定义模块
    if (modulePath.startsWith('/') || modulePath.startsWith('.')) {
        mPath = path.isAbsolute(modulePath) ? modulePath : path.resolve(modulePath)
    } else {
        // node_modules 第三方模块
        mPath = modulePath
    }

    let result = null
    // 校验hooks配置的路径和提供的模块(也可能来自第三方)路径是否一致??
    try {
        mPath = require.resolve(mPath, {
            paths: [
                path.resolve(process.cwd(), 'node_modules')
            ]
        })
    } catch (e) {
        log.error(e.message)
    }
    if (mPath && fs.existsSync(mPath)) {
        const isMJS = mPath.endsWith('mjs')
        if (isMJS) {
            //  On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
            result = (await import(pathToFileURL(mPath))).default
        } else {
            // require只支持 js|json 
            result = require(mPath)
        }
    }
    return result
}

module.exports = {
    getConfigFilePath,
    loadMoudle
}