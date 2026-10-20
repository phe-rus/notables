import { useEffect, useState } from "react";
import type { PendingReceiptProps } from "@/features/finances/model/types";
import { ReceiptTile } from "./receipt-tile";

export function PendingReceipt({ file, onPreview, onRemove }: PendingReceiptProps) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <ReceiptTile src={src} onPreview={onPreview} onRemove={onRemove} /> : null;
}
