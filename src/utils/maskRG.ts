// ============================================================
// Máscara de RG (00.000.000-0), extraída em 28/09/2026 (achado do
// Joaquim: EditarMatriculaForm.tsx — cadastro/self-service do aluno em
// /completar-cadastro — não tinha máscara nenhuma no campo RG, enquanto
// ProfessorForm.tsx e NovoMembroForm.tsx já tinham cada um sua própria
// cópia local da mesma função. Centralizado aqui pra não haver mais uma
// terceira cópia divergente.
// ============================================================

export function maskRG(raw: string): string {
  let v = raw.replace(/\D/g, "").slice(0, 9);
  if (v.length > 7) v = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}-${v.slice(8)}`;
  else if (v.length > 4) v = `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  else if (v.length > 2) v = `${v.slice(0, 2)}.${v.slice(2)}`;
  return v;
}
