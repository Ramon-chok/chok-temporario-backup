import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const steps = [
  '1. Faça login com seu usuário e senha.',
  '2. Navegue pelo menu lateral para acessar dashboards e relatórios.',
  '3. Utilize os filtros para personalizar os dados exibidos.',
  '4. Baixe relatórios em Excel ou PDF quando necessário.',
  '5. Use os botões flutuantes para acessar calculadora e notas.',
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[rgba(255,255,255,0.78)] hover:bg-blue-600 hover:text-white transition-colors"
        title="Ajuda"
        onClick={() => setOpen(true)}
      >
        <span className="inline-block bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg mr-2">?</span>
        <span>Ajuda</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative mx-4 md:mx-0">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 text-blue-600">Como utilizar a plataforma</h2>
            <ol className="list-decimal pl-5 mb-4 text-gray-700">
              {steps.map((step, idx) => (
                <li key={idx} className="mb-2">{step}</li>
              ))}
            </ol>
            <div className="mt-4 flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition-colors"
                onClick={() => {
                  setOpen(false);
                  setTimeout(() => window.dispatchEvent(new CustomEvent('open-chamado-modal')), 200);
                }}
              >
                Abrir chamado
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
