// Server Component — no "use client"
// force-dynamic opts this route out of prerendering at build time
export const dynamic = "force-dynamic"

import { ClientWrapper } from "./client-wrapper"

export default function Page() {
  return <ClientWrapper />
}
