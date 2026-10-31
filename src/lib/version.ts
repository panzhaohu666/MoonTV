// 当前部署的版本号（YYYYMMDDHHMMSS），由 scripts/generate-version.js 写入。
// 仅用于在 UI 上显示，不再做远程版本比对：
// 本项目是自维护的 fork，构建流程不会在构建时刷新版本号，
// 靠远程 VERSION.txt 比对只会给出不可靠的结论。
const CURRENT_VERSION = '20261031183136';

export { CURRENT_VERSION };
