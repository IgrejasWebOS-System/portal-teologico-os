import { redirect } from "next/navigation";
import { BarChart3, Building, Map as MapIcon, Church, GitBranch, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import AcessoRestrito from "@/components/admin/AcessoRestrito";
import PageHeader from "@/components/layout/PageHeader";

export const metadata = { title: "Relatório por território — CETADP" };

// ── Fase 5 (parecer Regionais/Núcleos de Ensino) ──────────────────
// ead_alunos.unit_id já é gravado corretamente em toda matrícula que
// passa por igreja (matricularDiretoAction e ficha-rápida — M8/M10c).
// Esta tela só falta soma-los, subindo a árvore de `units`
// (Campo → Sede → Setor/Regional → Igreja → Sub-unidade), pra
// finalmente "viabilizar os relatórios por Sede/Setor/Regional".

type UnitType = "CAMPO" | "SEDE" | "SETOR" | "IGREJA" | "SUB_CONGREGACAO" | "PONTO_PREGACAO" | "CELULA";

type UnitRow = { id: string; type: UnitType; name: string; parent_id: string | null };

type TreeNode = {
  id: string;
  type: UnitType;
  name: string;
  categoria: "SETOR" | "REGIONAL" | null;
  direto: number;
  total: number;
  children: TreeNode[];
};

const TYPE_LABEL: Record<UnitType, string> = {
  CAMPO: "Campo",
  SEDE: "Sede",
  SETOR: "Setor",
  IGREJA: "Igreja",
  SUB_CONGREGACAO: "Sub-congregação",
  PONTO_PREGACAO: "Ponto de Pregação",
  CELULA: "Célula",
};

const TYPE_ICON: Record<UnitType, typeof Building> = {
  CAMPO: Building,
  SEDE: Building,
  SETOR: MapIcon,
  IGREJA: Church,
  SUB_CONGREGACAO: GitBranch,
  PONTO_PREGACAO: GitBranch,
  CELULA: GitBranch,
};

export default async function RelatorioTerritorioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isStaff = await checkIsStaff(supabase, user.id);
  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center px-8">
        <AcessoRestrito />
      </div>
    );
  }

  const [unitsRes, sectorsRes, alunosRes] = await Promise.all([
    supabase.from("units").select("id, type, name, parent_id"),
    supabase.from("sectors").select("unit_id, categoria"),
    supabase.from("ead_alunos").select("unit_id").not("unit_id", "is", null),
  ]);

  const units = (unitsRes.data ?? []) as UnitRow[];

  const categoriaPorUnit = new Map<string, "SETOR" | "REGIONAL">();
  for (const s of sectorsRes.data ?? []) {
    if (s.unit_id) categoriaPorUnit.set(s.unit_id, (s.categoria as "SETOR" | "REGIONAL") ?? "SETOR");
  }

  const diretoPorUnit = new Map<string, number>();
  for (const a of alunosRes.data ?? []) {
    if (!a.unit_id) continue;
    diretoPorUnit.set(a.unit_id, (diretoPorUnit.get(a.unit_id) ?? 0) + 1);
  }

  const totalAlunosComUnidade = alunosRes.data?.length ?? 0;

  const nodeMap = new Map<string, TreeNode>();
  for (const u of units) {
    nodeMap.set(u.id, {
      id: u.id,
      type: u.type,
      name: u.name,
      categoria: u.type === "SETOR" ? (categoriaPorUnit.get(u.id) ?? "SETOR") : null,
      direto: diretoPorUnit.get(u.id) ?? 0,
      total: 0,
      children: [],
    });
  }

  const roots: TreeNode[] = [];
  for (const u of units) {
    const node = nodeMap.get(u.id)!;
    if (u.parent_id && nodeMap.has(u.parent_id)) {
      nodeMap.get(u.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function ordenarFilhos(node: TreeNode) {
    node.children.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    node.children.forEach(ordenarFilhos);
  }
  roots.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  roots.forEach(ordenarFilhos);

  function calcularTotal(node: TreeNode): number {
    let soma = node.direto;
    for (const filho of node.children) {
      soma += calcularTotal(filho);
    }
    node.total = soma;
    return soma;
  }
  for (const root of roots) calcularTotal(root);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Relatório por território"
        description="Matrículas somadas na árvore Campo → Sede → Setor/Regional → Igreja → Sub-unidade, a partir do unit_id gravado em cada matrícula."
      />

      <div className="bg-iw-surface border border-iw-border rounded-2xl p-5 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-iw-blue/10 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-iw-blue" />
        </div>
        <div>
          <p className="text-sm font-bold text-iw-navy">{totalAlunosComUnidade} matrícula(s) vinculada(s) a uma unidade</p>
          <p className="text-xs text-iw-muted">
            Matrículas vindas da inscrição pública sem igreja informada (aluno de fora) não entram nesta soma —
            por desenho, elas ficam fora da árvore de unidades.
          </p>
        </div>
      </div>

      {roots.length === 0 ? (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-10 text-center">
          <p className="text-iw-muted text-sm">Nenhum Campo cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-iw-surface border border-iw-border rounded-2xl p-3 shadow-sm">
          <ul className="space-y-1">
            {roots.map((node) => (
              <TreeRow key={node.id} node={node} depth={0} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const Icon = TYPE_ICON[node.type];
  const label = node.type === "SETOR" ? (node.categoria === "REGIONAL" ? "Regional" : "Setor") : TYPE_LABEL[node.type];

  return (
    <li>
      <div
        className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-iw-bg/60 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-iw-muted shrink-0" />
          <span className="text-[10px] font-bold text-iw-muted uppercase tracking-wider shrink-0">{label}</span>
          <span className="text-sm text-iw-navy truncate">{node.name}</span>
        </div>
        <span
          className={`text-xs font-bold shrink-0 px-2.5 py-0.5 rounded-full border ${
            node.total > 0
              ? "bg-iw-success-bg text-iw-success border-iw-success/30"
              : "bg-iw-bg text-iw-muted border-iw-border"
          }`}
        >
          {node.total} matrícula{node.total === 1 ? "" : "s"}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
