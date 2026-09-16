"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    organization: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    if (formData.password.length < 12) {
      setError(t("auth.register.passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email,
          organization: formData.organization,
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("auth.register.failed"));
        setIsLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch (err) {
      console.error("Registration error:", err);
      setError(t("auth.register.unexpectedError"));
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {t("auth.register.title")}
          </CardTitle>
          <CardDescription>{t("auth.register.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">{t("auth.firstName")}</Label>
                <Input
                  id="firstname"
                  name="firstname"
                  type="text"
                  placeholder={t("auth.firstName")}
                  value={formData.firstname}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">{t("auth.lastName")}</Label>
                <Input
                  id="lastname"
                  name="lastname"
                  type="text"
                  placeholder={t("auth.lastName")}
                  value={formData.lastname}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t("auth.email.placeholder")}
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">{t("auth.organization")}</Label>
              <Input
                id="organization"
                name="organization"
                type="text"
                placeholder={t("auth.organization")}
                value={formData.organization}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t("auth.username")}</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={t("auth.username.placeholder")}
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t("auth.register.passwordMinLength")}
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
                minLength={12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("auth.confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder={t("auth.password.placeholder")}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                required
                minLength={12}
              />
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t("auth.register.submitting")
                : t("auth.register.submit")}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              {t("auth.register.terms")}{" "}
              <Link href="/terms" className="text-primary hover:underline">
                {t("auth.register.termsLink")}
              </Link>{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                {t("auth.register.privacyLink")}
              </Link>
              .
            </p>
            <p className="text-muted-foreground text-center text-sm">
              {t("auth.register.hasAccount")}{" "}
              <Link href="/login" className="text-primary hover:underline">
                {t("auth.login.submit")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
