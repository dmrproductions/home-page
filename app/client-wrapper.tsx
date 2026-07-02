"use client"

import loadDynamic from "next/dynamic"

// ssr:false ensures home-page-client never executes during server render
const HomePage = loadDynamic(() => import("./home-page-client"), {
  ssr: false,
  loading: () => null,
})

export function ClientWrapper() {
  return <HomePage />
}
