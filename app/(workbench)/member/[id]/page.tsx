import { MemberProfile } from "@/components/member-profile";
import { BACKGROUND_CASES, HERO_CASES } from "@/data/seed";

export function generateStaticParams() {
  return [...HERO_CASES, ...BACKGROUND_CASES].map(({ id }) => ({ id }));
}

export default function MemberPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return <MemberProfile id={id} />;
}
