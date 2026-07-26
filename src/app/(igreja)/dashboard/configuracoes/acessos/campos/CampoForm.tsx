import { Building, MapPin, Phone, User, Mail } from "lucide-react";
import { criarCampoAction, atualizarCampoAction } from "./actions";

const inputCls =
  "w-full bg-white border border-iw-border rounded-xl px-3 py-2.5 text-sm text-iw-navy placeholder-iw-muted focus:border-iw-blue focus:outline-none focus:ring-2 focus:ring-iw-blue/20 transition-colors";
const labelCls = "block text-[11px] font-bold text-iw-muted uppercase tracking-wider mb-1.5";
const sectionTitleCls =
  "flex items-center gap-2 text-xs font-black text-iw-navy uppercase tracking-widest mb-4 pb-2 border-b border-iw-border";

type CampoData = {
  campoId: string;
  sedeId: string;
  churchId: string | null;
  nomeCampo: string;
  nomeSede: string;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  telefone?: string | null;
  contato?: string | null;
  email?: string | null;
};

interface Props {
  existing?: CampoData;
  submitLabel?: string;
}

export default function CampoForm({ existing, submitLabel = "Cadastrar Campo" }: Props) {
  const action = existing ? atualizarCampoAction : criarCampoAction;

  return (
    <form action={action} className="space-y-6">
      {existing && (
        <>
          <input type="hidden" name="campo_id" value={existing.campoId} />
          <input type="hidden" name="sede_id" value={existing.sedeId} />
          <input type="hidden" name="church_id" value={existing.churchId ?? ""} />
        </>
      )}

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Building className="w-4 h-4 text-iw-blue" />
          Identificação
        </h3>

        <div>
          <label className={labelCls}>Nome do Campo *</label>
          <input
            name="nome_campo"
            type="text"
            required
            defaultValue={existing?.nomeCampo}
            placeholder="Ex: ADBRAS Caruaru Ministério Madureira"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Nome da Sede *</label>
          <input
            name="nome_sede"
            type="text"
            required
            defaultValue={existing?.nomeSede}
            placeholder="Ex: ADBRAS Sede Caruaru"
            className={inputCls}
          />
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <MapPin className="w-4 h-4 text-iw-gold" />
          Endereço da Sede
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>CEP</label>
            <input name="cep" type="text" defaultValue={existing?.cep ?? ""} placeholder="00000-000" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Endereço</label>
            <input name="endereco" type="text" defaultValue={existing?.endereco ?? ""} placeholder="Rua, Avenida..." className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Número</label>
            <input name="numero" type="text" defaultValue={existing?.numero ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Complemento</label>
            <input name="complemento" type="text" defaultValue={existing?.complemento ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Bairro</label>
            <input name="bairro" type="text" defaultValue={existing?.bairro ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>UF</label>
            <input name="uf" type="text" maxLength={2} defaultValue={existing?.uf ?? ""} placeholder="SP" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Cidade</label>
          <input name="cidade" type="text" defaultValue={existing?.cidade ?? ""} className={inputCls} />
        </div>
      </div>

      <div className="bg-iw-surface rounded-2xl border border-iw-border shadow-sm p-6 space-y-4">
        <h3 className={sectionTitleCls}>
          <Phone className="w-4 h-4 text-iw-blue" />
          Contato
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <User className="w-3 h-3 inline mr-1" />
              Contato / Responsável
            </label>
            <input name="contato" type="text" defaultValue={existing?.contato ?? ""} placeholder="Nome do responsável" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input name="telefone" type="text" defaultValue={existing?.telefone ?? ""} placeholder="+55 (00) 00000-0000" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            <Mail className="w-3 h-3 inline mr-1" />
            E-mail
          </label>
          <input name="email" type="email" defaultValue={existing?.email ?? ""} placeholder="contato@campo.org" className={inputCls} />
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex items-center gap-2 bg-iw-navy text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-iw-navy/90 transition-colors"
      >
        <Building className="w-4 h-4" />
        {submitLabel}
      </button>
    </form>
  );
}
