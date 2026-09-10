const formats: Record<string, { extensions: string[]; signature: number[] }> = {
  "application/pdf": { extensions: ["pdf"], signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  "image/png": { extensions: ["png"], signature: [137, 80, 78, 71, 13, 10, 26, 10] },
  "image/jpeg": { extensions: ["jpg", "jpeg"], signature: [255, 216, 255] },
};

export async function validatePrivateFile(file: File, signatureOnly = false): Promise<string> {
  const format = formats[file.type];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const limit = (signatureOnly ? 2 : 10) * 1024 * 1024;
  if (!format || (signatureOnly && file.type === "application/pdf") || !format.extensions.includes(extension)) {
    throw new Error("File type and extension must be PDF, PNG or JPEG.");
  }
  if (file.size <= 0 || file.size > limit) throw new Error("File is empty or exceeds the upload limit.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!format.signature.every((byte, index) => bytes[index] === byte)) throw new Error("File contents do not match its type.");
  return extension;
}
