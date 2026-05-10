'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface SidebarNavProps {
  nome: string
  gaepCodigo: string
  perfil: string
}

const NAV_ITEMS = [
  { href: '/relatorio', icon: '📝', label: 'Relatório', implemented: true },
  { href: '/dashboard', icon: '📊', label: 'Dashboard', implemented: true },
  { href: '/operadores', icon: '👮', label: 'Individual', implemented: true },
  { href: '/missoes', icon: '✈️', label: 'Missões', implemented: true },
  { href: '/gestao', icon: '⚙️', label: 'Gestão', implemented: true },
] as const

export function SidebarNav({ nome, gaepCodigo, perfil }: SidebarNavProps) {
  const [open, setOpen] = useState(false)
  const [gestaoExpanded, setGestaoExpanded] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(perfil)
  const isSuperAdmin = perfil === 'SUPER_ADMIN'
  const defaultGestaoTab = isAdmin ? 'efetivo' : 'dados-pessoais'
  const activeGestaoTab = searchParams.get('tab') ?? defaultGestaoTab

  const visible = NAV_ITEMS
  const gestaoSubItemsTodos = [{ href: '/gestao?tab=dados-pessoais', icon: '👤', label: 'Dados Pessoais', tab: 'dados-pessoais' }] as const
  const gestaoSubItemsAdmin = [
    { href: '/gestao?tab=efetivo', icon: '👮', label: 'Efetivo', tab: 'efetivo' },
    { href: '/gestao?tab=atividades', icon: '📋', label: 'Atividades', tab: 'atividades' },
    { href: '/gestao?tab=feriados', icon: '📅', label: 'Feriados', tab: 'feriados' },
    { href: '/gestao?tab=ia', icon: '🤖', label: 'Config IA', tab: 'ia' },
    { href: '/gestao?tab=relatorio', icon: '📄', label: 'Relatório', tab: 'relatorio' },
    { href: '/gestao?tab=diarias', icon: '💰', label: 'Diárias', tab: 'diarias' },
    { href: '/gestao?tab=importacao', icon: '📥', label: 'Importar', tab: 'importacao' },
  ] as const
  const gestaoSubItemsSuper = [
    { href: '/gestao?tab=gaeps', icon: '🌐', label: 'GAEPs', tab: 'gaeps' },
    { href: '/gestao?tab=logs', icon: '📋', label: 'Logs', tab: 'logs' },
  ] as const

  const gestaoSubItems = [
    ...gestaoSubItemsTodos,
    ...(isAdmin ? gestaoSubItemsAdmin : []),
    ...(isSuperAdmin ? gestaoSubItemsSuper : []),
  ] as const

  return (
    <>
      {/* Header fixo */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          background: '#1a237e',
          display: 'flex',
          alignItems: 'center',
          zIndex: 400,
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.35rem',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 8,
            lineHeight: 1,
            position: 'absolute',
            left: 12,
          }}
        >
          ☰
        </button>
        <span
          style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: '1.1rem',
            letterSpacing: 1,
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 'calc(100% - 96px)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {gaepCodigo}
        </span>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 410,
          }}
        />
      )}

      {/* Drawer */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: '#fff',
          zIndex: 420,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px',
            background: '#1a237e',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>GAEP Comando</span>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Info do usuário */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Operador Ativo
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a237e', marginTop: 2 }}>{nome}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{perfil}</div>
        </div>

        {/* Itens de navegação */}
        <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
          {visible.map((item) => {
            const active = pathname.startsWith(item.href)
            const isGestao = item.href === '/gestao'
            if (!item.implemented) {
              return (
                <div
                  key={item.href}
                  title="Em breve"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1px solid transparent',
                    color: '#cbd5e1',
                    cursor: 'not-allowed',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>{item.icon}</span>
                  {item.label}
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 700 }}>EM BREVE</span>
                </div>
              )
            }
            return (
              <div key={item.href}>
                {isGestao ? (
                  <button
                    onClick={() => setGestaoExpanded((prev) => !prev)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1px solid ${active ? 'rgba(26,35,126,0.15)' : 'transparent'}`,
                      background: active ? 'rgba(26,35,126,0.08)' : 'transparent',
                      color: active ? '#1a237e' : '#475569',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: active ? 700 : 600,
                      textDecoration: 'none',
                      transition: '0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{gestaoExpanded || active ? '▾' : '▸'}</span>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: `1px solid ${active ? 'rgba(26,35,126,0.15)' : 'transparent'}`,
                      background: active ? 'rgba(26,35,126,0.08)' : 'transparent',
                      color: active ? '#1a237e' : '#475569',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: active ? 700 : 600,
                      textDecoration: 'none',
                      transition: '0.15s',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )}
                {(gestaoExpanded || active) && isGestao && (
                  <div style={{ padding: '4px 0 6px 30px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {gestaoSubItems.map((sub) => {
                      const subActive = pathname === '/gestao' && activeGestaoTab === sub.tab
                      return (
                        <Link
                          key={sub.tab}
                          href={sub.href}
                          onClick={() => setOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: `1px solid ${subActive ? 'rgba(26,35,126,0.2)' : 'transparent'}`,
                            background: subActive ? 'rgba(26,35,126,0.08)' : 'transparent',
                            color: subActive ? '#1a237e' : '#64748b',
                            textDecoration: 'none',
                            fontSize: '0.82rem',
                            fontWeight: subActive ? 700 : 600,
                          }}
                        >
                          <span>{sub.icon}</span>
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Logout */}
        <div style={{ padding: '10px 10px 20px' }}>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid #fecaca',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              🚪 Sair do Sistema
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}
