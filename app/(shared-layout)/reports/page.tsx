"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Download,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ReportExportType =
  | "risk-summary"
  | "asset-risk"
  | "compliance"
  | "risk-treatment";

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  const downloadExport = (type: ReportExportType, format: "csv" | "xls") => {
    window.location.assign(`/api/reports/export?type=${type}&format=${format}`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-linear-to-b dark:from-blue-950/20 dark:to-slate-950/20 p-4 sm:p-6 md:p-8 pb-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Тайлан & Дүн шинжилгээ</h1>
            <p className="text-muted-foreground">
              Үнэлгээний тайланг үүсгэж татаж авах
            </p>
          </div>
        </div>

        {/* Report Cards */}
        <div>
          <h2 className="text-xl font-bold mb-3">Боломжит тайлангууд</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Risk Treatment — live */}
            <Card className="h-full border transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500/30">
              <CardContent className="p-5 h-full flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <Link href="/reports/risk-treatment" className="group">
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors mt-1" />
                  </Link>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Эрсдэлийн арга хэмжээ</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    Бууруулах · Хүлээн зөвшөөрөх · Шилжүүлэх · Зайлсхийх задаргаа.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Link href="/reports/risk-treatment">
                    <Button size="sm" variant="outline" className="w-full">
                      Нээх
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadExport("risk-treatment", "csv")}
                  >
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadExport("risk-treatment", "xls")}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Risk Summary */}
            <Card className="h-full border border-slate-200/50 dark:border-slate-700/50 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <CardContent className="p-5 h-full flex flex-col gap-3">
                <div className="p-2.5 rounded-xl bg-muted/60 w-fit">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Эрсдэлийн хураангуй</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    Бүх тодорхойлогдсон эрсдэл, ноцтой байдал, санал болгосон арга хэмжээний тойм.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadExport("risk-summary", "xls")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Excel татах
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadExport("risk-summary", "csv")}
                  className="w-full"
                >
                  CSV татах
                </Button>
              </CardContent>
            </Card>

            {/* Asset Risk */}
            <Card className="h-full border border-slate-200/50 dark:border-slate-700/50 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <CardContent className="p-5 h-full flex flex-col gap-3">
                <div className="p-2.5 rounded-xl bg-muted/60 w-fit">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Хөрөнгийн эрсдэл</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    Хөрөнгөөр бүлэглэсэн эрсдэлийн шинжилгээ, хамгийн өндөр эрсдэлтэй хөрөнгүүд.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadExport("asset-risk", "xls")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Excel татах
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadExport("asset-risk", "csv")}
                  className="w-full"
                >
                  CSV татах
                </Button>
              </CardContent>
            </Card>

            {/* Compliance */}
            <Card className="h-full border border-slate-200/50 dark:border-slate-700/50 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <CardContent className="p-5 h-full flex flex-col gap-3">
                <div className="p-2.5 rounded-xl bg-muted/60 w-fit">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">Нийцэл</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">
                    NIST CSF 2.0 болон бусад аюулгүй байдлын стандарттай нийцлийн үнэлгээ.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadExport("compliance", "xls")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Excel татах
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadExport("compliance", "csv")}
                  className="w-full"
                >
                  CSV татах
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Export status */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Шууд экспорт</h2>
          <Card className="py-12 text-center border app-card-surface">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-100/30 dark:bg-blue-950/30 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-blue-600/40" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Тайлангууд шууд өгөгдлөөс экспортлогдоно
              </h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Дээрх тайлангийн картуудыг ашиглан одоогийн эрсдэл, хөрөнгө,
                нийцэл эсвэл арга хэмжээний өгөгдлийг CSV эсвэл Excel форматаар татаж авна уу.
              </p>
              <Button
                variant="outline"
                onClick={() => downloadExport("risk-summary", "xls")}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Эрсдэлийн хураангуй татах
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
