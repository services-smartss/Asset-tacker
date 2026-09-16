"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/hooks/useI18n";

export default function MfaVerifyForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use BetterAuth's two-factor verification
      const verifyFn = useBackupCode
        ? authClient.twoFactor.verifyBackupCode
        : authClient.twoFactor.verifyTotp;
      const result = await verifyFn({ code: code.trim() });

      if (result?.error) {
        setError(t("auth.login.invalid"));
        setIsLoading(false);
      } else {
        // MFA verified — redirect to home
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error("MFA verification error:", err);
      setError(t("auth.login.error"));
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("auth.mfa.title")}
          </CardTitle>
          <CardDescription>
            {useBackupCode
              ? t("auth.forgotPassword.checkEmail")
              : t("auth.login.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t("auth.mfa.verify")}</Label>
              <Input
                id="code"
                type="text"
                placeholder={
                  useBackupCode
                    ? t("auth.username.placeholder")
                    : t("auth.password.placeholder")
                }
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
                autoComplete="one-time-code"
                inputMode={useBackupCode ? "text" : "numeric"}
                maxLength={useBackupCode ? 20 : 6}
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("auth.login.submitting") : t("auth.mfa.verify")}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-muted-foreground hover:text-foreground text-sm underline"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode("");
                  setError("");
                }}
              >
                {useBackupCode
                  ? t("auth.login.submit")
                  : t("common.tryAgain")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
