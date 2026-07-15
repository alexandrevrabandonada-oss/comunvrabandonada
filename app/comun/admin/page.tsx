import{redirect}from'next/navigation';import{requireComunAdmin}from'@/lib/admin-auth';export default async function Page(){await requireComunAdmin();redirect('/comun/admin/organizacao')}
