
const semver = require('semver')
module.exports = function checkNodeVersion(min) {
    const curVersion = semver.valid(semver.coerce(process.version))
    return semver.satisfies(curVersion, '>=' + min)
}