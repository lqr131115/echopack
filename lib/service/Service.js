const path = require('path')
const fs = require('fs')
const WebpackChain = require('webpack-chain')
const WebpackDevServer = require('webpack-dev-server')
const C = require('./costant')
const log = require('../utils/log')
const { getConfigFilePath, loadMoudle } = require('../utils');
const initDevPlugin = require('../../plugins/initDevPlugin')
const initBuildPlugin = require('../../plugins/initBuildPlugin')

class Service {
    constructor(cmd, opts) {
        this.args = opts
        this.cmd = cmd
        this.dir = process.cwd()
        this.config = {}
        this.hooks = {}
        this.plugins = []
        this.webpackConfig = null
        this.internalValue = {}
    }

    start = async () => {
        await this.resolveConfig()
        await this.registerHooks()
        await this.emitHooks(C.HOOK_CREATED)
        await this.registerPlugins()
        await this.emitHooks(C.PLUGIN_CREATED)
        await this.runPlugins()
        if (!this.args.stop) {
            await this.initWebpack()
            await this.startServer()
        }
    }

    initWebpack = async () => {
        const { customWebpackPath } = this.args
        if (customWebpackPath) {
            if (fs.existsSync(customWebpackPath)) {
                let p = customWebpackPath
                if (!path.isAbsolute(p)) {
                    p = path.resolve(p)
                }
                this.webpack = require.resolve(p)
            }
            log.verbose('webpack from :custom path')
        } else {
            this.webpack = require.resolve('webpack', {
                paths: [
                    path.resolve(this.dir, 'node_modules')
                ]
            })
            log.verbose('webpack from :node_modules')
        }
    }

    resolveConfig = async () => {
        const { config } = this.args
        let configFilePath = ''
        if (config) {
            if (path.isAbsolute(config)) {
                configFilePath = config
            } else {
                configFilePath = path.resolve(config)
            }
            this.config = await loadMoudle(configFilePath) ?? {}
        }
        // 全局搜索是否存在默认配置文件夹 
        else {
            configFilePath = getConfigFilePath(this.cwd)
            if (configFilePath) {
                this.config = await loadMoudle(configFilePath) ?? {}
            } else {
                log.error('缺失默认配置文件');
                process.exit(1)
            }
        }
        this.webpackConfig = new WebpackChain()
    }

    /**
     * @type Array
     * 
     * Hooks:[
     *  ['name', function(){}],
     * ]
     * 
     */
    registerHooks = async () => {
        const { hooks } = this.config
        if (hooks && hooks.length) {
            // 不能使用forEach 在其参数前面加aync 会导致emitHooks 早于loadMoudle执行
            for (const [name, func] of hooks) {
                if (name && typeof name === 'string' && func && Object.values(C).includes(name)) {
                    const hasExited = this.hooks[name]
                    if (!hasExited) {
                        this.hooks[name] = []
                    }
                    // 配置文件是js|mjs
                    if (typeof func === 'function') {
                        this.hooks[name].push(func)
                    }
                    // 配置文件是json 
                    else if (typeof func === 'string') {
                        const newF = await loadMoudle(func)
                        if (newF) {
                            this.hooks[name].push(newF)
                        }
                    }
                }
            }
        }
    }

    emitHooks = async (hook) => {
        const hooks = this.hooks[hook] ?? []
        for (const fnc of hooks) {
            try {
                await fnc(this)
            } catch (e) {
                log.error(e)
            }
        }
    }

    /**
     * @type Function | Array
     * 
     * plugins: function() => {}
     * plugins:[
     *  ['name']
     *  ['name', {}],
     *  ['name', function(){}],
     * ]
     * 
     */
    registerPlugins = async () => {
        const defaultPlugin = this.cmd === 'start' ? [initDevPlugin] : [initBuildPlugin]
        defaultPlugin.forEach((mod) => {
            this.plugins.push({ mod })
        })
        let { plugins } = this.config
        if (plugins) {
            if (typeof plugins === 'function') {
                plugins = plugins()
            }
            if (Array.isArray(plugins)) {
                for (const plugin of plugins) {
                    if (typeof plugin === 'string') {
                        const mod = await loadMoudle(plugin)
                        this.plugins.push({ mod })
                    } else if (Array.isArray(plugin)) {
                        const [path, param] = plugin
                        const mod = await loadMoudle(path)
                        this.plugins.push({ mod, param })
                    } else if (typeof plugin === 'function') {
                        this.plugins.push({
                            mod: plugin
                        })
                    }
                }
            }
        }
    }

    runPlugins = async () => {
        for (const plugin of this.plugins) {
            const { mod, param = {} } = plugin
            if (!mod) {
                continue
            }
            const API = {
                getWebpackConfig: this.getWebpackConfig,
                emitHooks: this.emitHooks,
                setValue: this.setValue,
                getValue: this.getValue,
                log
            }
            const options = { ...param }
            await mod(API, options)
        }
    }

    startServer = async () => {

        let compiler;
        let serverConfig;
        let devServer;
        try {
            const webpack = require(this.webpack)
            const webpackConfig = this.webpackConfig.toConfig()
            log.verbose('webpackConfig', webpackConfig)
            compiler = webpack(webpackConfig, (error, stats) => {
                if (error) {
                    log.error(error)
                } else {
                    const { errors, warnings, time } = stats.toJson({ all: false, errors: true, warnings: true, time: true })
                    if (errors.length) {
                        errors.forEach((error) => {
                            log.error(error.message)
                        })
                    } else if (warnings.length) {
                        warnings.forEach((warning) => {
                            log.warn(warning.message)
                        })
                    } else {
                        log.info('COMPILE SUCCESS!', time >= 0 ? `compile finish in ${time / 1000} s` : '')
                    }
                }
            })
            serverConfig = {
                port: this.args.port ?? 8080,
                host: this.args.host ?? '0.0.0.0',
                https: this.args.https ?? false
            }
            if (WebpackDevServer.getFreePort) {
                devServer = new WebpackDevServer(serverConfig, compiler)
            } else {
                devServer = new WebpackDevServer(compiler, serverConfig)
            }

            if (devServer.startCallback) {
                devServer.startCallback((err) => {
                    if (err) {
                        log.error('dev-server launch error:' + err.toString())
                    } else {
                        log.info('dev-server launch success!!');
                    }
                })
            } else {
                devServer.listen(serverConfig.port, serverConfig.host, (err) => {
                    if (err) {
                        log.error('dev-server launch error:' + err.toString())
                    } else {
                        log.info('dev-server launch success!!');
                    }
                })
            }
        } catch (e) {
            log.error('startServer', e.message);
        }
    }

    getWebpackConfig = () => {
        return this.webpackConfig
    }

    setValue = (key, val) => {
        this.internalValue[key] = val
    }

    getValue = (key) => {
        return this.internalValue[key]
    }


}


module.exports = Service