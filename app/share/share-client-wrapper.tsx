"use client"

import loadDynamic from "next/dynamic"

const ShareContent = loadDynamic(() => import("./share-content"), {
  ssr: false,
  loading: () => null,
})

export function ShareClientWrapper({ token }: { token: string }) {
  return <ShareContent token={token} />
}
