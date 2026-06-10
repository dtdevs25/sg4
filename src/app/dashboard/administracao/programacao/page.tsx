'use client'

import { Calendar, Plus } from 'lucide-react'

export default function ProgramacaoRelatoriosPage() {
  return (
    <div className="flex flex-col gap-[24px] pb-[40px]">
      <div className="bg-white rounded-[10px] border border-[#f1f5f9] shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-[20px] py-[14px] flex items-center justify-between flex-wrap gap-[16px]">
        <div className="flex items-baseline gap-[10px]">
          <h1 className="text-[20px] font-extrabold text-[#1e293b] m-0 flex items-center gap-[8px]">
            <Calendar color="#660099" size={22} />
            Programação
          </h1>
          
        </div>
      </div>
      
      <div className="bg-white p-[40px] rounded-[10px] border border-[#f1f5f9] text-center">
        <p className="text-[#64748b]">A configuração do dia e hora para envio de relatórios será implementada aqui.</p>
      </div>
    </div>
  )
}
