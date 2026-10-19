/** Keep Android picker grants alive until every selected image has owned bytes. */
export async function copyPickedReceipts(
  files: readonly File[],
  release: () => void,
): Promise<File[]> {
  try {
    const selected = files.filter((file) => file.type.startsWith("image/"));
    if (
      selected.length > 10 ||
      selected.reduce((size, file) => size + file.size, 0) > 40 * 1024 * 1024
    )
      throw new Error("receipt-images-too-large");
    const copies: File[] = [];
    for (const file of selected) {
      copies.push(
        new File([await file.arrayBuffer()], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        }),
      );
    }
    return copies;
  } finally {
    release();
  }
}
