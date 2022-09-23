/**
 * 线上服务的默认构建配置
 */
const path = require('path')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function initPlugin(api, options) {
    const { getWebpackConfig } = api
    const config = getWebpackConfig()
    const dir = process.cwd()
    // 获取构建模式
    const mode = process.env.ECHO_BUILD_MODE || 'development'
    config.mode(mode)

    // entry
    config.entry('index')
        .add(path.resolve(dir, './src/index.js'))
        .end()

    // output
    config.output
        .path(path.resolve(dir, './dist'))
        .filename('js/[name].js');

    // module
    config.module
        .rule('css')
        .test(/\.css$/)
        .exclude
        .add(path.resolve(dir, 'node_modules'))
        .end()
        .use('min-css')
        .loader(MiniCssExtractPlugin.loader)
        .end()
        .use('css-loader')
        .loader('css-loader')
        .end()

    config.module
        .rule('asset')
        .test(/\.(png|jpg|svg|jpeg)$/i)
        .type('asset')
        .parser({
            dataUrlCondition: {
                maxSize: 4 * 1024,
            },
        })
    // generator webpack5 新特性 webpack-chain 暂不支持 手动添加
    config.module.rule('asset').set('generator', {
        filename: 'images/[name].[hash:6][ext]'
    })


    // config.module
    //     .rule('cjs')
    //         .test(/\.ejs$/)
    //         .use('ejs-loader')
    //             .loader('ejs-loader')
    //             .options({
    //                 esModule: false
    //             })

    // config.module
    //     .rule('vue')
    //         .test(/\.vue$/)
    //         .use('vue-loader')
    //             .loader('vue-loader')


    // plugin
    config.plugin('HtmlWebpackPlugin')
        .use(HtmlWebpackPlugin, [{
            filename: 'index.html',
            template: path.resolve(dir, './public/index.html'),
            chunks: ['index']
        }]);

    config.plugin('MiniCssExtractPlugin')
        .use(MiniCssExtractPlugin, [{
            filename: 'css/[name].css',
            chunkFilename: 'css/[name].chunk.css'
        }]);

    // optimization 
    config.optimization
        .minimize(true)
        .usedExports(true)

    config.optimization
        .splitChunks({
            chunks: 'all',
            name: 'common',
            minSize: 30 * 1024,
            cacheGroups: {
                jquery: {
                    name: 'jquery',
                    test: /jquery\.js/,
                    chunks: 'all'
                }
            }
        })

    config.watch(true)
}