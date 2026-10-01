/** Size of one page and the layout it implies, derived from the stage. */
export interface PageGeometry {
  /** Two pages side by side, like an open book. */
  spread: boolean;
  pageWidth: number;
  pageHeight: number;
  /** Margin inside the page. */
  padding: number;
  /** Text block size inside the margins. */
  textWidth: number;
  textHeight: number;
  /** Gap between CSS columns: one column = one page. */
  columnGap: number;
}

const PAGE_RATIO = 1.42;
const PHONE_PAGE_RATIO = 1.75;
const MAX_PAGE_WIDTH = 560;

export function measurePage(stageWidth: number, stageHeight: number): PageGeometry {
  const spread = stageWidth >= 900 && stageWidth > stageHeight * 1.15;
  const availableWidth = spread ? (stageWidth - 64) / 2 : stageWidth - 24;
  // Phones read one tall page at a time; spreads keep classic book proportions.
  const ratio = spread ? PAGE_RATIO : PHONE_PAGE_RATIO;
  let pageWidth = Math.min(availableWidth, MAX_PAGE_WIDTH);
  let pageHeight = pageWidth * ratio;
  const maxHeight = stageHeight - 24;
  if (pageHeight > maxHeight) {
    pageHeight = maxHeight;
    pageWidth = Math.min(pageWidth, pageHeight / (spread ? PAGE_RATIO : 1.2));
  }
  pageWidth = Math.floor(pageWidth);
  pageHeight = Math.floor(pageHeight);
  const padding = Math.round(Math.min(56, Math.max(22, pageWidth * 0.09)));
  const footer = 28;
  return {
    spread,
    pageWidth,
    pageHeight,
    padding,
    textWidth: pageWidth - padding * 2,
    textHeight: pageHeight - padding * 2 - footer,
    columnGap: padding * 2,
  };
}
