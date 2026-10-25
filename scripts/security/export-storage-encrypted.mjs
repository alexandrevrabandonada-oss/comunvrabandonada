import { exportEncryptedStorage } from "../../lib/security/storage-encrypted-stream.mjs";
import { createReadonlyStorageSource } from "../../lib/security/storage-readonly-source.mjs";

let source;
try {
  const args = process.argv.slice(2);
  const allowed = new Set(["--age", "--age-sha256", "--recipient", "--output"]);
  const values = {};
  if (args.length !== 8) throw new Error("OPTIONS");
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || Object.hasOwn(values, args[i]) || !args[i + 1])
      throw new Error("OPTIONS");
    values[args[i]] = args[i + 1];
  }
  source = createReadonlyStorageSource();
  const result = await exportEncryptedStorage({
    source,
    age: values["--age"],
    ageSha256: values["--age-sha256"],
    recipient: values["--recipient"],
    output: values["--output"],
  });
  console.log(JSON.stringify(result));
} catch {
  console.error("COMUN_STORAGE_ENCRYPTED_EXPORT_FAILED");
  process.exitCode = 1;
} finally {
  source?.close();
}
