export function getHelpText(): string {
  return `X 视频下载命令行工具

用法:
  x-downloader <链接> [选项]

选项:
  -o, --output <dir>      输出目录（默认 ~/Downloads）
  -n, --filename <name>   自定义文件名（可含扩展名）
  -f, --format <format>   传给 yt-dlp 的格式选择（默认 best）
  -F, --list-formats      列出可用格式
  --cookies <file>        cookies 文件路径
  --proxy <url>           代理地址
  --user-agent <ua>       自定义 User-Agent
  -q, --quiet             静默输出
  --dry-run               仅打印命令不执行
  -h, --help              显示帮助
  -v, --version           显示版本

示例:
  x-downloader https://x.com/user/status/123
  x-downloader https://x.com/user/status/123 -o ./videos -n demo.mp4
  x-downloader https://x.com/user/status/123 -F
`;
}
