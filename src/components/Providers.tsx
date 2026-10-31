'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

const ACTION_BUTTON_REGEX = /\b(salvar|cadastrar|registrar|confirmar|excluir|deletar|enviar|efetivar|concluir|transferir|reverter|criar|gravar|lançar|lancar)\b/i

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Proteção global síncrona na fase de captura contra duplo-envio de formulários (<form>)
    const handleCaptureSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null
      if (!form || form.tagName !== 'FORM') return

      const now = Date.now()
      const lastSubmit = Number(form.dataset.sg4LastSubmit || '0')

      // Se o formulário já foi submetido há menos de 1.5s ou possui botão submit desabilitado, bloqueia
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLButtonElement | null
      if ((submitBtn && submitBtn.disabled) || (lastSubmit > 0 && now - lastSubmit < 1500)) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      form.dataset.sg4LastSubmit = String(now)
    }

    // 2. Proteção global síncrona na fase de captura contra duplo-clique rápido em botões de ação/submit
    const handleCaptureClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const button = target.closest('button') as HTMLButtonElement | null
      if (!button) return

      if (button.disabled) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      const isSubmitBtn =
        button.type === 'submit' ||
        (!button.getAttribute('type') && !!button.closest('form'))
      const text = (button.textContent || '').trim()
      const isActionBtn = isSubmitBtn || ACTION_BUTTON_REGEX.test(text)

      if (!isActionBtn) return

      const now = Date.now()
      const lastClick = Number(button.dataset.sg4LastClick || '0')
      if (lastClick > 0 && now - lastClick < 1200) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      button.dataset.sg4LastClick = String(now)
    }

    document.addEventListener('submit', handleCaptureSubmit, true)
    document.addEventListener('click', handleCaptureClick, true)
    return () => {
      document.removeEventListener('submit', handleCaptureSubmit, true)
      document.removeEventListener('click', handleCaptureClick, true)
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
