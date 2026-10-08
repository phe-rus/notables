import { useLayoutEffect, useRef, useState } from "react";
import { InvoicePaper, type InvoicePaperProps, PAPER_HEIGHT, PAPER_WIDTH } from "./invoice-paper";

/** The A4 page, scaled down to fit its pane, sitting on a soft shadow. */
export function PaperPreview(props: InvoicePaperProps) {
  const frame = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  // Long documents grow past one page; follow the paper's real height.
  const [height, setHeight] = useState(PAPER_HEIGHT);

  useLayoutEffect(() => {
    const element = frame.current;
    const page = paper.current;
    if (!element || !page) return;
    const fit = () => {
      setScale(Math.min(1, (element.clientWidth - 48) / PAPER_WIDTH));
      setHeight(page.offsetHeight);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="flex w-full justify-center px-6 py-8">
      <div
        className="overflow-hidden rounded-sm shadow-[0_2px_6px_rgba(0,0,0,0.06),0_24px_60px_rgba(60,40,0,0.14)]"
        style={{ width: PAPER_WIDTH * scale, height: height * scale }}
      >
        <div
          ref={paper}
          style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: PAPER_WIDTH }}
        >
          <InvoicePaper {...props} />
        </div>
      </div>
    </div>
  );
}
