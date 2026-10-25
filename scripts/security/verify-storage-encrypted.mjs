import { verifyEncryptedStorage } from "../../lib/security/storage-encrypted-stream.mjs";

try {
  const args = process.argv.slice(2);
  const allowed = new Set([
    "--age",
    "--age-sha256",
    "--identity",
    "--input",
    "--cipher-sha256",
  ]);
  const values = {};
  if (args.length !== 10) throw new Error("OPTIONS");
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || Object.hasOwn(values, args[i]) || !args[i + 1])
      throw new Error("OPTIONS");
    values[args[i]] = args[i + 1];
  }
  console.log(
    JSON.stringify(
      await verifyEncryptedStorage({
        age: values["--age"],
        ageSha256: values["--age-sha256"],
        identity: values["--identity"],
        input: values["--input"],
        expectedCipherSha256: values["--cipher-sha256"],
      }),
    ),
  );
} catch {
  console.error("COMUN_STORAGE_ENCRYPTED_VERIFICATION_FAILED");
  process.exitCode = 1;
}
