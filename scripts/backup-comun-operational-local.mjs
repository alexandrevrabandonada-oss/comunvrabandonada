import {writeFile} from "node:fs/promises";import {resolve} from "node:path";import {createBackup} from "./comun-operational-backup.mjs";
if(!process.env.COMUN_LOCAL_ONLY) throw new Error("Backup permitido somente com COMUN_LOCAL_ONLY=1");
const target=resolve(process.argv[2]??"comun-operational-backup.local.json"); await writeFile(target,JSON.stringify(createBackup([]),null,2)); console.log("COMUN_OPERATIONAL_BACKUP_LOCAL_OK");
