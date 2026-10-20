import { CheckIcon } from "@phe-rus/hino";
import { Toggle } from "@phe-rus/hino/toggle";
import { t } from "@/i18n/i18n";
import type { LicenceStepProps } from "../model/types";
import { StepTitle } from "./step-title";

export function LicenceStep({ agreed, onAgree }: LicenceStepProps) {
  return (
    <>
      <StepTitle title={t("setup.yours")}>{t("setup.yoursBody")}</StepTitle>
      <ul className="flex flex-col gap-2.5 text-subheadline leading-snug">
        {[t("setup.promiseDevice"), t("setup.promiseNothingSent"), t("setup.promiseBin")].map(
          (line) => (
            <li key={line} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                <CheckIcon size={12} strokeWidth={3} />
              </span>
              {line}
            </li>
          ),
        )}
      </ul>
      <div className="max-h-[180px] overflow-y-auto rounded-3xl bg-fill/60 p-4 text-caption leading-relaxed text-label-secondary">
        <p className="mb-2 font-semibold text-label">MIT License. Copyright (c) 2026 Pherus.</p>
        <p>
          Permission is hereby granted, free of charge, to any person obtaining a copy of this
          software and associated documentation files (the "Software"), to deal in the Software
          without restriction, including without limitation the rights to use, copy, modify, merge,
          publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
          to whom the Software is furnished to do so, subject to the following conditions: the above
          copyright notice and this permission notice shall be included in all copies or substantial
          portions of the Software.
        </p>
        <p className="mt-2">
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
          FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
          OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
          DEALINGS IN THE SOFTWARE.
        </p>
      </div>
      <div className="rounded-2xl border border-separator bg-elevated px-3 py-3">
        <Toggle style="checkbox" label={t("setup.agree")} checked={agreed} onChange={onAgree} />
      </div>
    </>
  );
}
