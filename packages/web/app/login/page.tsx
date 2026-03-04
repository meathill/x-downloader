'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Zap, ArrowLeft, Mail, Lock, User as UserIcon } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegister) {
        await signUp.email(
          {
            email,
            password,
            name,
            callbackURL: '/',
          },
          {
            onSuccess: () => router.push('/'),
            onError: (ctx) => setError(ctx.error.message || '注册失败'),
          },
        );
      } else {
        await signIn.email(
          {
            email,
            password,
            callbackURL: '/',
          },
          {
            onSuccess: () => router.push('/'),
            onError: (ctx) => setError(ctx.error.message || '登录失败，请检查邮箱和密码'),
          },
        );
      }
    } catch (err) {
      setError('发生意外错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 selection:bg-primary/30">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,oklch(0.9_0.1_280)_0%,transparent_50%)] opacity-40" />

      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        返回首页
      </Link>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary p-1.5 shadow-lg shadow-primary/20">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="brightness-110" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{isRegister ? '加入 X Downloader' : '欢迎回来'}</h1>
          <p className="mt-2 text-muted-foreground">
            {isRegister ? '创建一个账号开始同步你的视频' : '登录以查看你的下载历史'}
          </p>
        </div>

        <Card className="border-border/40 bg-card/50 shadow-2xl backdrop-blur-md ring-1 ring-white/10">
          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="grid gap-6">
              {isRegister && (
                <Field>
                  <FieldLabel htmlFor="name">昵称</FieldLabel>
                  <div className="relative mt-1.5">
                    <Input
                      id="name"
                      placeholder="你的名字"
                      className="h-12 pl-11 bg-background/40 border-border/30"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                      <UserIcon size={18} />
                    </div>
                  </div>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="email">邮箱地址</FieldLabel>
                <div className="relative mt-1.5">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="h-12 pl-11 bg-background/40 border-border/30"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                    <Mail size={18} />
                  </div>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 pl-11 bg-background/40 border-border/30"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">
                    <Lock size={18} />
                  </div>
                </div>
              </Field>

              {error && (
                <div className="text-sm font-medium text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="xl"
                className="h-12 w-full bg-primary shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="fill-current" />
                    {isRegister ? '立即注册' : '登录'}
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              {isRegister ? '已经有账号了？' : '还没有账号？'}{' '}
              <button
                type="button"
                className="font-semibold text-primary shadow-primary/10 transition-all hover:underline"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
              >
                {isRegister ? '点击登录' : '立即注册'}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground/50">
          继续操作即表示您同意我们的服务条款和隐私政策。
        </p>
      </div>
    </div>
  );
}
