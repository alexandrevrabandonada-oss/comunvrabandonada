import { buildTransactionalPackage } from "./sql-contract.mjs";

const sql = buildTransactionalPackage();
if (!sql.startsWith("\\set ON_ERROR_STOP on\nBEGIN;") || !sql.endsWith("COMMIT;\n")) throw new Error("SOLO_TRANSACTION_BOUNDARY_INVALID");
console.log("COMUN_FORWARD_ONLY_SQL_OK");
