"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DownloadStatus = "idle" | "loading" | "success" | "error";

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
  url: string;
  filename: string | null;
  format: string | null;
  output_path: string | null;
  status: string;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  finished_at: number | null;
  error: string | null;
};

export default function HomePage(): JSX.Element {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState("");
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  async function fetchTasks(): Promise<void> {
    setIsLoadingTasks(true);
    try {
      const response = await fetch("/api/downloads?limit=100");
      const data = (await response.json()) as { ok: boolean; items?: DownloadTask[] };
      if (data.ok && Array.isArray(data.items)) {
        setTasks(data.items);
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleDelete(taskId: number): Promise<void> {
    if (!confirm("确认要删除这条记录并移除文件吗？")) {
      return;
    }

    setIsDeletingId(taskId);
    try {
      const response = await fetch(`/api/downloads/${taskId}`, { method: "DELETE" });
      const data = (await response.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setStatus("error");
        setMessage(data.message ?? "删除失败");
      }
    } finally {
      setIsDeletingId(null);
      await fetchTasks();
    }
  }

  function formatTimestamp(value: number | null): string {
    if (!value) {
      return "-";
    }
    return new Date(value).toLocaleString("zh-CN");
  }

  function renderStatusBadge(value: string): JSX.Element {
    switch (value) {
      case "queued":
        return <Badge variant="warning">排队中</Badge>;
      case "running":
        return <Badge variant="info">下载中</Badge>;
      case "done":
        return <Badge variant="success">已完成</Badge>;
      case "failed":
        return <Badge variant="error">失败</Badge>;
      default:
        return <Badge variant="outline">{value}</Badge>;
    }
  }

  function getDownloadHref(task: DownloadTask): string | null {
    if (task.status !== "done") {
      return null;
    }
    if (!task.output_path) {
      return null;
    }
    return `/api/downloads/${task.id}/file`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setStatus("loading");
    setMessage("");
    setLogs([]);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          filename: filename.trim() ? filename.trim() : undefined,
          format: format.trim() ? format.trim() : undefined
        })
      });

      const data = (await response.json()) as DownloadResponse;
      setStatus(data.ok ? "success" : "error");
      const baseMessage = data.message ?? "";
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      if (data.task) {
        const acceptLabel = data.accepted === false ? "未入队" : "已入队";
        setMessage(
          `${baseMessage} 任务 #${data.task.id}（${data.task.status ?? "queued"} / ${acceptLabel}）`
        );
      } else {
        setMessage(baseMessage);
      }
      await fetchTasks();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "请求失败";
      setStatus("error");
      setMessage(errorMessage);
    }
  }

  function handleReset(): void {
    setUrl("");
    setFilename("");
    setFormat("");
    setStatus("idle");
    setMessage("");
    setLogs([]);
  }

  useEffect(() => {
    void fetchTasks();
  }, []);

  const statusTone =
    status === "success"
      ? "text-emerald-600"
      : status === "error"
        ? "text-rose-600"
        : "text-muted-foreground";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,var(--accent)_0%,var(--background)_45%,var(--muted)_100%)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">X Downloader</Badge>
            <Badge variant="outline">self-hosted</Badge>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">把 X 视频下载到你的服务器</h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            粘贴链接即可下载。默认保存到服务器的 <span className="font-semibold text-foreground">~/Downloads</span>，
            默认最高质量格式（需要安装 ffmpeg）。
          </p>
        </header>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>开始下载</CardTitle>
            <CardDescription>支持 x.com / twitter.com 链接，格式可按需覆盖。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <form onSubmit={handleSubmit} className="grid gap-6">
              <Field>
                <FieldLabel htmlFor="url">视频链接</FieldLabel>
                <FieldControl>
                  <Input
                    id="url"
                    name="url"
                    placeholder="https://x.com/user/status/123"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                    }}
                    required
                  />
                </FieldControl>
                <FieldDescription>必须是公开可访问的推文链接。</FieldDescription>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="filename">文件名（可选）</FieldLabel>
                  <FieldControl>
                    <Input
                      id="filename"
                      name="filename"
                      placeholder="demo.mp4"
                      value={filename}
                      onChange={(event) => {
                        setFilename(event.target.value);
                      }}
                    />
                  </FieldControl>
                </Field>
                <Field>
                  <FieldLabel htmlFor="format">格式（可选）</FieldLabel>
                  <FieldControl>
                    <Input
                      id="format"
                      name="format"
                      placeholder="bestvideo*+bestaudio/best"
                      value={format}
                      onChange={(event) => {
                        setFormat(event.target.value);
                      }}
                    />
                  </FieldControl>
                  <FieldDescription>如需单文件下载，可填 best。</FieldDescription>
                </Field>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "下载中..." : "开始下载"}
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  清空
                </Button>
              </div>
            </form>

            <Separator />
            <div className="rounded-xl border bg-background p-4">
              <p className={`text-sm ${statusTone}`}>{message || "等待指令中"}</p>
              {logs.length > 0 ? (
                <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {logs.join("")}
                </pre>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="justify-between text-xs text-muted-foreground">
            <span>默认最高质量需要 ffmpeg。</span>
            <span>输出目录：~/Downloads</span>
          </CardFooter>
        </Card>

        <section className="grid gap-2 text-xs text-muted-foreground">
          <p>提示：下载任务由服务器执行，不会在浏览器本地保存。</p>
          <p>如需限制输出路径或下载频率，可在 `web/lib/download.ts` 中扩展。</p>
        </section>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-1">
              <CardTitle>下载记录</CardTitle>
              <CardDescription>已入队与已完成的任务列表。</CardDescription>
            </div>
            <Button variant="outline" onClick={fetchTasks} disabled={isLoadingTasks}>
              {isLoadingTasks ? "刷新中..." : "刷新"}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>链接</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>输出文件</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      暂无记录
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => {
                    const downloadHref = getDownloadHref(task);

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">#{task.id}</TableCell>
                        <TableCell className="max-w-xs truncate" title={task.url}>
                          {task.url}
                        </TableCell>
                        <TableCell>{renderStatusBadge(task.status)}</TableCell>
                        <TableCell>{formatTimestamp(task.created_at)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={task.output_path ?? ""}>
                          {task.output_path ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {downloadHref ? (
                              <a
                                className={buttonVariants({ variant: "secondary", size: "sm" })}
                                href={downloadHref}
                                download
                              >
                                下载
                              </a>
                            ) : (
                              <Button variant="secondary" size="sm" disabled>
                                下载
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isDeletingId === task.id || task.status === "running"}
                              onClick={() => {
                                void handleDelete(task.id);
                              }}
                            >
                              {isDeletingId === task.id ? "删除中..." : "删除"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
