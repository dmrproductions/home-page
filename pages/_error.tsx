import type { NextPageContext } from "next"

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <p style={{ textAlign: "center", padding: "4rem", fontFamily: "sans-serif" }}>
      {statusCode ? `An error ${statusCode} occurred on server` : "An error occurred on client"}
    </p>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as NodeJS.ErrnoException & { statusCode?: number }).statusCode : 404
  return { statusCode }
}

export default Error
