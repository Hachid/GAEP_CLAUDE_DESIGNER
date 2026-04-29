export default function OperadoresLoading() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          background: '#1a237e',
          zIndex: 400,
        }}
      />
      <main
        style={{
          minHeight: '100vh',
          background: '#f3f4f6',
          padding: '74px 16px 20px',
        }}
      >
        <div style={{ maxWidth: 430, margin: '0 auto' }}>
          <Skeleton height={28} width={260} style={{ margin: '0 auto 22px' }} />
          <Skeleton height={160} style={{ marginBottom: 20, borderRadius: 12 }} />
          <Skeleton height={60} style={{ marginBottom: 12 }} />
          <Skeleton height={60} style={{ marginBottom: 12 }} />
          <Skeleton height={60} />
        </div>
      </main>
    </>
  )
}

function Skeleton({ height, width, style }: { height: number; width?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height,
        width: width ?? '100%',
        borderRadius: 12,
        background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'gaep-shimmer 1.4s infinite',
        ...style,
      }}
    />
  )
}
