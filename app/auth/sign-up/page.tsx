"use client";

import { useAuth } from "@/app/context/AuthContext";
import { signUpSchema } from "@/app/schemas/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
  });

  async function onSubmit(values: SignUpFormData) {
    setServerError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message || "Алдаа гарлаа");
        setIsLoading(false);
        return;
      }

      // Auto-login after registration
      login({
        user_id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: "user",
      });

      // Redirect to home page
      router.push("/");
    } catch (error) {
      setServerError("Сервертэй холбогдож чадсангүй");
      console.error(error);
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Бүртгүүлэх</CardTitle>
        <CardDescription>Эхлэхийн тулд бүртгэл үүсгэнэ үү</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-y-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Бүтэн нэр</FieldLabel>
                  <Input
                    aria-invalid={fieldState.invalid}
                    placeholder="Бат Дорж"
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>И-мэйл</FieldLabel>
                  <Input
                    aria-invalid={fieldState.invalid}
                    placeholder="johndoe@example.com"
                    type="email"
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Нууц үг</FieldLabel>
                  <Input
                    aria-invalid={fieldState.invalid}
                    placeholder="••••••••"
                    type="password"
                    {...field}
                  />
                  <p className="text-xs text-muted-foreground">
                    Том болон жижиг үсэг, тоо, тусгай тэмдэгт оролцуулан 8-30
                    тэмдэгт ашиглана уу.
                  </p>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {serverError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Бүртгэж байна..." : "Бүртгүүлэх"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Бүртгэлтэй юу?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:underline"
              >
                Нэвтрэх
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
