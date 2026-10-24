import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { listPortfolioSlugs } from "@/server/services/pickers";
import { PageHeader, Card } from "@/components/admin/ui";
import { PortfolioForm } from "@/components/admin/portfolio-form";

export default async function NewPortfolioPage() {
  await requirePermission("cms:write");
  const slugs = await listPortfolioSlugs();
  return (
    <>
      <PageHeader title="New portfolio project" description="Create the record first. Add screenshots on the next screen. Publishing requires the approval flag." actions={<Link href="/admin/portfolio" className="text-xs text-muted hover:text-on-dark">Portfolio</Link>} />
      <Card className="max-w-4xl">
        <PortfolioForm allSlugs={slugs} />
      </Card>
    </>
  );
}
