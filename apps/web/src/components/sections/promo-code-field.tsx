import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmd } from "@/lib/utils";
import type { PromoApplyResponse } from "@/types";

interface PromoCodeFieldProps {
  result?: PromoApplyResponse;
  isLoading?: boolean;
  isError?: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}

export function PromoCodeField({ result, isLoading = false, isError = false, onApply, onRemove }: PromoCodeFieldProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = value.trim();
    if (code) onApply(code);
  };

  const applied = !isLoading && !isError && result?.status === "APPLIED";
  let message: string | null = null;
  if (isError) message = t("promo.error");
  else if (!isLoading && result?.status === "BELOW_MINIMUM")
    message = t("promo.below_minimum", { amount: formatAmd(result.missingAmount ?? 0) });
  else if (!isLoading && result?.status === "EXPIRED") message = t("promo.expired");
  else if (!isLoading && result?.status === "NOT_FOUND") message = t("promo.not_found");

  return (
    <form className="space-y-2 border-t border-zinc-100 px-5 py-4" onSubmit={handleSubmit} noValidate>
      <Label htmlFor="promo-code">{t("promo.label")}</Label>
      <div className="flex gap-2">
        <Input
          id="promo-code"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("promo.placeholder")}
          autoComplete="off"
          className="uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="outline" className="shrink-0 rounded-xl" disabled={isLoading || !value.trim()}>
          {isLoading ? t("promo.checking") : t("promo.apply")}
        </Button>
      </div>
      <div aria-live="polite">
        {applied && result && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
            <span>{t("promo.applied", { code: result.code, percent: result.percent })}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 text-emerald-800"
              aria-label={t("promo.remove")}
              onClick={() => {
                setValue("");
                onRemove();
              }}
            >
              <X size={14} strokeWidth={2} />
            </Button>
          </div>
        )}
        {message && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-100" role="alert">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
