import{describe,expect,it}from"vitest";import{resolveMediaStorageProvider}from"./index";
describe("resolveMediaStorageProvider",()=>{
 it("usa fixture por padrão em NODE_ENV=test",()=>{expect(resolveMediaStorageProvider({NODE_ENV:"test"})).toBe("fixture")});
 it("usa r2 por padrão fora de teste",()=>{expect(resolveMediaStorageProvider({NODE_ENV:"development"})).toBe("r2");expect(resolveMediaStorageProvider({NODE_ENV:"production"})).toBe("r2")});
 it("aceita os três providers explícitos",()=>{expect(resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"r2"})).toBe("r2");expect(resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"supabase-local"})).toBe("supabase-local");expect(resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"fixture",NODE_ENV:"test"})).toBe("fixture")});
 it("recusa provider desconhecido em vez de cair em r2",()=>{expect(()=>resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"s3"})).toThrow(/inválido/);expect(()=>resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"R2"})).toThrow(/inválido/)});
 it("recusa fixture em produção",()=>{expect(()=>resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"fixture",NODE_ENV:"production"})).toThrow(/proibido em produção/)});
 it("aceita fixture em desenvolvimento quando explicito",()=>{expect(resolveMediaStorageProvider({MEDIA_STORAGE_PROVIDER:"fixture",NODE_ENV:"development"})).toBe("fixture")});
});
