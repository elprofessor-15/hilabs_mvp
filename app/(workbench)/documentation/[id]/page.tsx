import { OutreachWorkspace } from "@/components/outreach-workspace";
import { BACKGROUND_CASES, HERO_CASES } from "@/data/seed";

export function generateStaticParams() {
  return [...HERO_CASES, ...BACKGROUND_CASES].map(({ id }) => ({ id }));
}

export default function DocumentationPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return <OutreachWorkspace id={id} mode="documentation" />;
}
