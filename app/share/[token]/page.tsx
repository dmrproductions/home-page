// Server Component — no "use client"
import { notFound } from "next/navigation"
import { ShareClientWrapper } from "../share-client-wrapper"

export const dynamic = "force-dynamic"

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const expected = process.env.SHARE_TOKEN

  // If SHARE_TOKEN isn't configured, fail closed — no token can ever match.
  if (!expected || token !== expected) {
    notFound()
  }

  return <ShareClientWrapper token={token} />
}
