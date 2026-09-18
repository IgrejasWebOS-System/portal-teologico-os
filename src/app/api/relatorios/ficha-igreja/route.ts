import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";
import { carregarEscopoConfiguracoes } from "@/app/[locale]/(igreja)/dashboard/configuracoes/accessoScope";
import {
  gerarPdfFichaResumida, gerarPdfFichaCompleta, type MembroFichaDados,
} from "@/utils/pdf/fichaMembros";

// ============================================================
// GET /api/relatorios/ficha-igreja?igrejaId=...&tipo=resumida|completa
//
// Gera em PDF a ficha cadastral dos membros ATIVOS de uma igreja —
// acionado pelo botão "Membros" em /dashboard/configuracoes/igrejas
// (pedido do Joaquim em 2026-09-18). Só staff (GLOBAL_ADMIN/
// SECTOR_ADMIN/LOCAL_ADMIN) com a igreja dentro do próprio escopo de
// acesso (mesma regra de carregarEscopoConfiguracoes usada na tela)
// pode gerar — nunca expõe dados de membros fora do escopo do login.
// ============================================================

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const igrejaId = searchParams.get("igrejaId");
  const tipo = searchParams.get("tipo") === "completa" ? "completa" : "resumida";

  if (!igrejaId) {
    return NextResponse.json({ erro: "Parâmetro igrejaId é obrigatório." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Faça login para gerar esta ficha." }, { status: 401 });
  }

  const ehStaff = await checkIsStaff(supabase, user.id);
  if (!ehStaff) {
    return NextResponse.json({ erro: "Sem permissão para gerar fichas de membros." }, { status: 403 });
  }

  const { escopo } = await carregarEscopoConfiguracoes(supabase);

  const { data: igreja, error: erroIgreja } = await supabase
    .from("churches")
    .select("id, name, sector_id, unit_id")
    .eq("id", igrejaId)
    .single();

  if (erroIgreja || !igreja) {
    return NextResponse.json({ erro: "Igreja não encontrada." }, { status: 404 });
  }

  // Fora do escopo do login (null = GLOBAL_ADMIN, sem restrição).
  if (escopo && (!igreja.unit_id || !escopo.has(igreja.unit_id))) {
    return NextResponse.json({ erro: "Sem acesso a esta igreja." }, { status: 403 });
  }

  let setorNome: string | null = null;
  if (igreja.sector_id) {
    const { data: setor } = await supabase
      .from("sectors")
      .select("name")
      .eq("id", igreja.sector_id)
      .single();
    setorNome = setor?.name ?? null;
  }

  const { data: membrosRaw, error: erroMembros } = await supabase
    .from("members")
    .select(
      "full_name, registration_number, ecclesiastical_roles(name), civil_status, birth_date, phone, email, cpf, rg, rg_issuer, rg_state, schooling, profession, nationality, nationality_city, nationality_state, spouse_name, mother_name, father_name, address, zip_code, neighborhood, city, state, photo_url"
    )
    .eq("church_id", igrejaId)
    .eq("status", "ACTIVE")
    .order("full_name");

  if (erroMembros) {
    return NextResponse.json({ erro: "Erro ao carregar os membros desta igreja." }, { status: 500 });
  }

  type LinhaMembro = {
    full_name: string;
    registration_number: string | null;
    ecclesiastical_roles: { name: string } | null;
    civil_status: string | null;
    birth_date: string | null;
    phone: string | null;
    email: string | null;
    cpf: string | null;
    rg: string | null;
    rg_issuer: string | null;
    rg_state: string | null;
    schooling: string | null;
    profession: string | null;
    nationality: string | null;
    nationality_city: string | null;
    nationality_state: string | null;
    spouse_name: string | null;
    mother_name: string | null;
    father_name: string | null;
    address: string | null;
    zip_code: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    photo_url: string | null;
  };

  const membros: MembroFichaDados[] = ((membrosRaw ?? []) as unknown as LinhaMembro[]).map((m) => ({
    fullName: m.full_name,
    matricula: m.registration_number,
    cargo: m.ecclesiastical_roles?.name ?? null,
    civilStatus: m.civil_status,
    birthDate: m.birth_date,
    phone: m.phone,
    email: m.email,
    cpf: m.cpf,
    rg: m.rg,
    rgIssuer: m.rg_issuer,
    rgState: m.rg_state,
    schooling: m.schooling,
    profession: m.profession,
    nationality: m.nationality,
    nationalityCity: m.nationality_city,
    nationalityState: m.nationality_state,
    spouseName: m.spouse_name,
    motherName: m.mother_name,
    fatherName: m.father_name,
    address: m.address,
    zipCode: m.zip_code,
    neighborhood: m.neighborhood,
    city: m.city,
    state: m.state,
    photoUrl: m.photo_url,
  }));

  const pdfBytes =
    tipo === "completa"
      ? await gerarPdfFichaCompleta(igreja.name, setorNome, membros)
      : await gerarPdfFichaResumida(igreja.name, setorNome, membros);

  const nomeArquivo = `ficha-${tipo}-${slug(igreja.name)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
