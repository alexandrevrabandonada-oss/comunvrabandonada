import{execFileSync}from"node:child_process";import{mkdir,rm,writeFile,readdir,readFile}from"node:fs/promises";import{resolve}from"node:path";
if(process.env.COMUN_LOCAL_ONLY!=="1")throw new Error("COMUN_LOCAL_ONLY=1 obrigatório");
const run=(cmd,args,options={})=>execFileSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"],...options});
const container=run("docker",["ps","--filter","name=supabase_db_","--format","{{.Names}}"] ).trim().split(/\r?\n/)[0];if(!container)throw new Error("Postgres local não encontrado");
const tag=`fixture-s33-1-${Date.now()}`,tempDb=`comun_restore_${Date.now()}`,dir=resolve("backups","sprint-33-1-temp"),dump=`/tmp/${tag}.dump`,baseDump=`/tmp/${tag}-base.dump`;
try{
 await mkdir(dir,{recursive:true});
 const sql=`insert into public.comun_editorial_operation_items(source_type,queue,title,fixture_tag) values('contribution','entry','Restore sintético','${tag}');`;
 run("docker",["exec",container,"psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-c",sql]);
 const inventory=run("docker",["exec",container,"psql","-U","postgres","-d","postgres","-At","-c",`select json_build_object('items',count(*),'events',(select count(*) from public.comun_editorial_operation_events),'storage_fixture',(select count(*) from storage.objects where name like '%fixture%')) from public.comun_editorial_operation_items where fixture_tag='${tag}'`]).trim();
 run("docker",["exec",container,"pg_dump","-U","postgres","-d","postgres","-Fc","--data-only","-t","public.comun_editorial_operation_items","-t","public.comun_editorial_operation_assignments","-t","public.comun_editorial_operation_events","-f",dump]);
 const bytes=run("docker",["exec",container,"sha256sum",dump]).trim().split(/\s+/)[0];await writeFile(resolve(dir,"inventory.json"),JSON.stringify({format:"comun-db-v1",fixture_tag:tag,inventory:JSON.parse(inventory),checksum_sha256:bytes},null,2));
 run("docker",["exec",container,"createdb","-U","postgres","-T","template0",tempDb]);
 run("docker",["exec",container,"pg_dump","-U","postgres","-d","postgres","-Fc","--schema-only","-n","auth","-n","storage","-f",baseDump]);run("docker",["exec",container,"pg_restore","-U","postgres","-d",tempDb,"--no-owner","--no-privileges",baseDump]);
 const migrations=(await readdir(resolve("supabase","migrations"))).filter(x=>x.endsWith(".sql")).sort();for(const file of migrations){const sqlText=await readFile(resolve("supabase","migrations",file),"utf8");run("docker",["exec","-i",container,"psql","-U","postgres","-d",tempDb,"-v","ON_ERROR_STOP=1"],{input:sqlText,stdio:["pipe","pipe","pipe"]})}
 run("docker",["exec",container,"pg_restore","-U","postgres","-d",tempDb,"--data-only","--no-owner","--no-privileges",dump]);
 const restored=run("docker",["exec",container,"psql","-U","postgres","-d",tempDb,"-At","-c",`select count(*) from public.comun_editorial_operation_items where fixture_tag='${tag}'`]).trim();if(restored!=="1")throw new Error("Relação fixture não restaurada");
 const grants=run("docker",["exec",container,"psql","-U","postgres","-d",tempDb,"-At","-c","select count(*) from information_schema.role_table_grants where table_name like 'comun_editorial_operation_%' and grantee in ('anon','authenticated')"] ).trim();if(grants!=="0")throw new Error("Restore abriu grants privados");
 console.log("COMUN_LOCAL_RESTORE_OK");console.log("COMUN_TEST_FIXTURES_CLEAN");
}finally{try{run("docker",["exec",container,"dropdb","-U","postgres","--if-exists",tempDb])}catch{}try{run("docker",["exec",container,"psql","-U","postgres","-d","postgres","-c",`delete from public.comun_editorial_operation_items where fixture_tag='${tag}'`])}catch{}try{run("docker",["exec",container,"rm","-f",dump,baseDump])}catch{}await rm(dir,{recursive:true,force:true})}
