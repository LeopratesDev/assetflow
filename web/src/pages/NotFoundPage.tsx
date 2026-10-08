import { Link } from "react-router-dom";
import { Zap, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-6">
        <Zap className="w-6 h-6 text-white" />
      </div>
      <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase mb-2">
        Erro 404
      </p>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Página não encontrada
      </h1>
      <p className="text-sm text-gray-500 max-w-sm mb-8">
        A rota que você tentou acessar não existe. Verifique o endereço ou volte ao painel.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
