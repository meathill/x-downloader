'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, History, Zap, Shield, Globe, Terminal, User, LogOut } from 'lucide-react';
import { signIn, signOut, useSession } from '@/lib/auth-client';

type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

type DownloadResponse = {
  ok: boolean;
  accepted?: boolean;
  message: string;
  task?: {
    id: number;
    status?: string;
  };
  logs?: string[];
};

type DownloadTask = {
  id: number;
  request_id: string;
  url: string;
  filename: string | null;
  format: string | null;
  r2_key: string | null;
  r2_url: string | null;
  status: string;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  finished_at: number | null;
  error: string | null;
};

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const { data: session, isPending: isSessionPending } = useSession();

  async function fetchTasks(): Promise<void> {
    setIsLoadingTasks(true);
    try {
      const response = await fetch('/api/downloads?limit=10');
      const data = (await response.json()) as { ok: boolean; items?: DownloadTask[] };
      if (data.ok && Array.isArray(data.items)) {
        setTasks(data.items);
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleDelete(taskId: number): Promise<void> {
    if (!confirm('确认要删除这条记录并移除文件吗？')) {
      return;
    }

    setIsDeletingId(taskId);
    try {
      const response = await fetch(`/api/downloads/${taskId}`, { method: 'DELETE' });
      const data = (await response.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setStatus('error');
        setMessage(data.message ?? '删除失败');
      }
    } finally {
      setIsDeletingId(null);
      await fetchTasks();
    }
  }

  function formatTimestamp(value: number | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderStatusBadge(value: string) {
    switch (value) {
      case 'queued':
        return (
          <Badge variant="warning" className="rounded-full px-2.5 py-0.5">
            排队中
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="info" className="rounded-full px-2.5 py-0.5 animate-pulse">
            下载中
          </Badge>
        );
      case 'done':
        return (
          <Badge variant="success" className="rounded-full px-2.5 py-0.5">
            已完成
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="rounded-full px-2.5 py-0.5">
            失败
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
            {value}
          </Badge>
        );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    setLogs([]);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          filename: filename.trim() ? filename.trim() : undefined,
          format: format.trim() ? format.trim() : undefined,
        }),
      });

      const data = (await response.json()) as DownloadResponse;
      setStatus(data.ok ? 'success' : 'error');
      setMessage(data.message ?? '');
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      await fetchTasks();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '请求失败');
    }
  }

  useEffect(() => {
    void fetchTasks();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,oklch(0.9_0.1_280)_0%,transparent_50%)] opacity-40" />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary p-1 shadow-lg shadow-primary/20">
              <Image src="/logo.png" alt="Logo" width={28} height={28} className="brightness-110" />
            </div>
            <span className="text-lg font-bold tracking-tight">X Downloader</span>
          </div>
          <div className="flex items-center gap-4">
            {isSessionPending ? (
              <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
            ) : session ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background/40 p-1 pr-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User size={14} />
                  </div>
                  <span className="text-xs font-medium">{session.user.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => void signOut()}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <LogOut size={14} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" render={<Link href="/login" />} className="hidden sm:inline-flex">
                  登录
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  render={<Link href="/login" />}
                  className="bg-primary shadow-lg shadow-primary/20"
                >
                  立即注册
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-24">
        {/* Hero Section */}
        <section className="mb-24 text-center">
          <Badge variant="secondary" className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-700">
            全新升级：更强、更美、更简单
          </Badge>
          <h1 className="mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent animate-in fade-in slide-in-from-bottom-4 sm:text-7xl duration-700 delay-100">
            把 X 视频
            <br />
            一键存入你的云盘
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            粘贴 X (Twitter) 链接，全自动化下载、转码并同步到你的云端存储。随时随地，最高画质保证。
          </p>

          {/* Main Action Card */}
          <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Card className="relative overflow-hidden border-border/40 bg-card/50 shadow-2xl backdrop-blur-md ring-1 ring-white/10">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="grid gap-6">
                  <Field className="text-left">
                    <FieldLabel htmlFor="url" className="text-sm font-semibold opacity-70">
                      推文链接
                    </FieldLabel>
                    <div className="mt-2 flex gap-3">
                      <div className="relative flex-1">
                        <Input
                          id="url"
                          placeholder="https://x.com/username/status/..."
                          className="h-14 border-border/30 bg-background/40 px-5 text-base focus:ring-primary/20"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          required
                        />
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
                          <Globe size={20} />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        size="xl"
                        className="h-14 min-w-[140px] bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
                        disabled={status === 'loading'}
                      >
                        {status === 'loading' ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            入队中...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-lg">
                            <Zap size={20} className="fill-current" />
                            开始下载
                          </div>
                        )}
                      </Button>
                    </div>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2 text-left">
                    <Field>
                      <FieldLabel htmlFor="filename" className="text-xs font-medium opacity-50">
                        自定义文件名 (可选)
                      </FieldLabel>
                      <Input
                        id="filename"
                        placeholder="my-video.mp4"
                        className="mt-1.5 h-11 border-border/20 bg-background/20"
                        value={filename}
                        onChange={(e) => setFilename(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="format" className="text-xs font-medium opacity-50">
                        FFmpeg 格式 (可选)
                      </FieldLabel>
                      <Input
                        id="format"
                        placeholder="bestvideo+bestaudio"
                        className="mt-1.5 h-11 border-border/20 bg-background/20"
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                      />
                    </Field>
                  </div>
                </form>

                {message && (
                  <div
                    className={`mt-6 rounded-xl border border-border/20 p-4 text-left transition-all ${status === 'error' ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-primary/5 text-primary border-primary/20'}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {status === 'error' ? <Shield size={16} /> : <Zap size={16} />}
                      {message}
                    </div>
                    {logs.length > 0 && (
                      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-3 text-[11px] font-mono leading-relaxed opacity-70">
                        {logs.join('')}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-32 grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: <Zap className="text-amber-500" />,
              title: '极速响应',
              desc: '基于 Cloudflare Worker 队列，秒级响应下载请求。',
            },
            {
              icon: <Shield className="text-emerald-500" />,
              title: '云盘直连',
              desc: '自动转存至你的云端空间，文件永久在线，随时预览。',
            },
            {
              icon: <Globe className="text-primary" />,
              title: '全球加速',
              desc: '节点遍布全球，无论身在何处都能快速下载。',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="group rounded-3xl border border-border/30 bg-card/30 p-8 transition-all hover:bg-card/50 hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </section>

        {/* Content Tabs / History */}
        <section className="relative">
          <div className="absolute inset-0 -z-50 bg-[radial-gradient(circle_at_100%_100%,oklch(0.5_0.2_300)_0%,transparent_40%)] opacity-10" />

          <div className="mb-8 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <History className="text-muted-foreground" size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">下载历史</h2>
                <p className="text-sm text-muted-foreground">最近生成的 10 条任务记录</p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchTasks} disabled={isLoadingTasks} className="gap-2">
              <Zap size={14} className={isLoadingTasks ? 'animate-spin' : ''} />
              刷新列表
            </Button>
          </div>

          <Card className="overflow-hidden border-border/40 bg-card/30 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/20">
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>原视频链接</TableHead>
                  <TableHead>任务状态</TableHead>
                  <TableHead>创建于</TableHead>
                  <TableHead className="text-right">任务操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        <Terminal size={48} />
                        <span className="text-sm">暂无下载记录</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id} className="group border-border/10 hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs opacity-50 underline decoration-primary/20 decoration-2 underline-offset-4">
                        #{task.id}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm hover:text-primary hover:underline transition-all"
                        >
                          {task.url}
                        </a>
                      </TableCell>
                      <TableCell>{renderStatusBadge(task.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimestamp(task.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.status === 'done' && (
                            <Button
                              variant="secondary"
                              size="xs"
                              render={<a href={`/api/downloads/${task.id}/file`} download />}
                            >
                              立即获取
                            </Button>
                          )}
                          <Button
                            variant="destructive-outline"
                            size="xs"
                            disabled={isDeletingId === task.id || task.status === 'running'}
                            onClick={() => void handleDelete(task.id)}
                          >
                            {isDeletingId === task.id ? '处理中' : '移除'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* Footer */}
        <footer className="mt-40 border-t border-border/20 pt-12 text-center text-sm text-muted-foreground/60">
          <p>© 2026 X Downloader • 基于 OpenNext & Cloudflare 构建</p>
          <div className="mt-4 flex justify-center gap-6">
            <span className="flex items-center gap-1.5">
              <Terminal size={12} /> Edge Runtime
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={12} /> Cloud Sync
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
