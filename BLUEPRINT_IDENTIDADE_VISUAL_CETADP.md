# BLUEPRINT DE IMPLEMENTAÇÃO — IDENTIDADE VISUAL CETADP
Versão corrigida e validada contra o código real do projeto.
Fonte de origem: `C:\Users\joaqu\Downloads\CETADP\Identidade_Visual_CETADP` (Manual v1.0, setembro/2026).
Ambiente de execução: `portal-teologico-os-staging` (staging-first, per `AGENTS.md`).

---

## 0. DIAGNÓSTICO — por que o blueprint original foi ajustado

O texto original assumia uma estrutura de monorepo (`/apps/site`, `/apps/platform`,
`/apps/portal`, `/packages/core`, `tailwind.config.js`). Essa estrutura **não existe**
no projeto. Inspeção direta do código mostrou:

| Assumido no blueprint original | Realidade no `portal-teologico-os-staging` |
|---|---|
| Monorepo com `/apps/*` e `/packages/core` | App único Next.js 16 (App Router), tudo em `src/` |
| `tailwind.config.js` + `theme.colors` | Tailwind v4 — tokens em bloco `@theme` dentro de `src/app/globals.css` (arquivo CSS puro, sem JS de config) |
| `packages/core/components/BrandProvider.tsx` | Já existe um mecanismo equivalente: `src/components/Logo.tsx` (fonte única do logo) + tokens `@theme` + barrel `src/components/ui` — documentado em `DESIGN_SYSTEM.md` |
| `/branding/fonts/` com TTF/OTF | O kit **não contém arquivos de fonte** (ver `LEIA-ME.txt` do kit: a fonte original do lettering não foi fornecida). As fontes definidas no manual (Cinzel + Source Sans 3) são Google Fonts, carregadas via `next/font/google` — mesmo mecanismo já usado hoje para Inter/Merriweather |
| `/branding/assets/templates/` (modelos institucionais) | O kit **não contém** banners, cabeçalhos ou cartões prontos — só logo, cores, manual e diretrizes de fotografia. Este blueprint não inventa arquivos que não existem |

Este documento segue a estrutura real. Cada fase tem comando de execução e
validação objetiva antes de avançar para a próxima.

**Achado crítico que muda o escopo:** a paleta e a tipografia **já em produção**
(`src/app/globals.css`) não batem com o Manual de Identidade Visual v1.0:

| Token atual (`globals.css`) | Valor atual | Valor oficial (Manual v1.0) |
|---|---|---|
| `--color-iw-gold` | `#C5A059` | `#CF8403` (dourado institucional) |
| `--color-iw-navy` | `#111111` | `#0D0D0D` (preto institucional) |
| Tipografia títulos | Merriweather | Cinzel |
| Tipografia corpo | Inter | Source Sans 3 |

Aplicar o manual = **mudança visual em todo o portal** (toda tela usa esses
tokens). Por isso a Fase 4 é feita em staging, com validação visual explícita
antes de qualquer merge para produção.

---

## 1. COMO foi analisada a pasta de origem

Conteúdo real do kit (`Identidade_Visual_CETADP/`), classificado:

- **Logos**: `01_Logo_Principal/Logo_Principal_Colorida_RGB_{1024,2048}.png`, `Logo_Original_Recebido_2048.png`
- **Monocromáticas**: `02_Versoes_Monocromaticas/Logo_Monocromatica_{Branca,Preta}_2048.png`
- **Fundo escuro**: `03_Fundo_Escuro/Logo_Para_Fundo_Escuro_2048.png`
- **Símbolo/favicon**: `04_Simbolo_e_Favicon/` — `favicon.ico` + `Simbolo_Colorido_{32,64,180,512,1024}x*.png` + `Simbolo_Fundo_Escuro_1024.png` + `Simbolo_Monocromatico_{Branco,Preto}_1024.png`
- **Vetores**: `05_Vetores/*.svg` e `*.eps` (todas as variações acima, em vetor)
- **Cores/web**: `06_Cores_e_Web/CETADP_cores.css` (variáveis prontas) + `Paleta_CETADP.txt` (HEX/RGB/CMYK)
- **Manual**: `07_Manual/Manual_de_Identidade_Visual_CETADP.pdf` (14 capítulos — regras de uso, área de proteção, tamanho mínimo, contraste, usos incorretos)
- **Fotografia institucional**: `08_Fotos_Institucionais/LEIA-ME_Fotos_Institucionais.txt` — **kit não contém fotos**, só diretrizes
- **Ícones separados / elementos gráficos / modelos institucionais**: **não existem no kit** — não há SVG de ícones de UI, banners ou templates de cabeçalho/rodapé prontos

Paleta extraída (`Paleta_CETADP.txt`):
```
Dourado institucional : #CF8403  |  RGB 207,132,3   | CMYK 0,36,99,19
Preto institucional    : #0D0D0D  |  RGB 13,13,13    | CMYK 0,0,0,95
Branco                 : #FFFFFF  |  RGB 255,255,255 | CMYK 0,0,0,0
Neutro claro (auxiliar): #F7F4ED  |  RGB 247,244,237 | CMYK 0,1,4,3
Cinza texto (auxiliar) : #4A4A4A  |  RGB 74,74,74    | CMYK 0,0,0,71
```
Pantone **não foi fornecido** — o manual exige prova de cor física antes de
homologar qualquer equivalência Pantone para impressão.

Tipografia oficial (capítulo 07 do manual):
```
Títulos/destaques : Cinzel        (pesos 600, 700)
Textos/interface  : Source Sans 3 (pesos 400, 600, 700)
```
Ambas gratuitas, Google Fonts, licença SIL Open Font License. O lettering
dentro do próprio logotipo **não deve ser redigitado** — permanece como
vetor/imagem (regra "Não reescrever", capítulo 10 do manual).

---

## 2. COMO estruturar os diretórios dentro do projeto real

Dentro de `portal-teologico-os-staging`, criar:

```
public/branding/
  logos/
  icons/
  colors/
```

Comando (PowerShell, execução completa e autocontida):

```powershell
cd C:\Projetos\portal-teologico-os-staging
New-Item -ItemType Directory -Force -Path "public\branding\logos","public\branding\icons","public\branding\colors" | Out-Null
```

**Validação da Fase 2:** rodar `Get-ChildItem public\branding -Recurse` e
confirmar as 3 subpastas vazias criadas.

Não criar `/branding/fonts/` (não há arquivos de fonte a guardar — fontes
vêm de `next/font/google`, sem arquivo físico no repo) nem
`/branding/assets/templates/` (não há arquivo correspondente no kit).

---

## 3. COMO copiar e organizar os arquivos de origem

Comando único (PowerShell, caminhos absolutos, pronto para colar):

```powershell
$origem = "C:\Users\joaqu\Downloads\CETADP\Identidade_Visual_CETADP"
$destino = "C:\Projetos\portal-teologico-os-staging\public\branding"

Copy-Item "$origem\01_Logo_Principal\Logo_Principal_Colorida_RGB_2048.png" "$destino\logos\logo-colorida.png"
Copy-Item "$origem\05_Vetores\Logo_Principal_Colorida.svg"                "$destino\logos\logo-colorida.svg"
Copy-Item "$origem\03_Fundo_Escuro\Logo_Para_Fundo_Escuro_2048.png"       "$destino\logos\logo-fundo-escuro.png"
Copy-Item "$origem\05_Vetores\Logo_Para_Fundo_Escuro.svg"                 "$destino\logos\logo-fundo-escuro.svg"
Copy-Item "$origem\02_Versoes_Monocromaticas\Logo_Monocromatica_Preta_2048.png"  "$destino\logos\logo-mono-preta.png"
Copy-Item "$origem\02_Versoes_Monocromaticas\Logo_Monocromatica_Branca_2048.png" "$destino\logos\logo-mono-branca.png"
Copy-Item "$origem\04_Simbolo_e_Favicon\Simbolo_Colorido_1024x1024.png"   "$destino\icons\simbolo-1024.png"
Copy-Item "$origem\04_Simbolo_e_Favicon\Simbolo_Colorido_512x512.png"     "$destino\icons\simbolo-512.png"
Copy-Item "$origem\04_Simbolo_e_Favicon\Simbolo_Colorido_180x180.png"     "$destino\icons\simbolo-180.png"
Copy-Item "$origem\05_Vetores\Simbolo_Isolado_Colorido.svg"               "$destino\icons\simbolo.svg"
Copy-Item "$origem\06_Cores_e_Web\CETADP_cores.css"                       "$destino\colors\cetadp-cores-referencia.css"
Copy-Item "$origem\06_Cores_e_Web\Paleta_CETADP.txt"                      "$destino\colors\paleta-referencia.txt"
Copy-Item "$origem\07_Manual\Manual_de_Identidade_Visual_CETADP.pdf"      "$destino\Manual_de_Identidade_Visual_CETADP.pdf"
```

Os arquivos de favicon (`favicon.ico`, `Simbolo_Colorido_32x32.png`,
`Simbolo_Colorido_64x64.png`) **não vão para `public/branding`** — vão
direto para `src/app/`, conforme a Fase 7 (mecanismo próprio do Next.js).

**Validação da Fase 3:**
```powershell
Get-ChildItem "C:\Projetos\portal-teologico-os-staging\public\branding" -Recurse -File | Measure-Object
```
Confirmar 12 arquivos copiados (6 logos PNG/SVG + 4 ícones + 2 arquivos de cor) + 1 manual PDF.

---

## 4. COMO atualizar os tokens de cor (`src/app/globals.css`)

Arquivo: `src/app/globals.css`, bloco `@theme` (linhas 9–53 atuais).

Substituir estes dois valores (mantendo o nome do token — nenhum componente
precisa ser tocado, porque todos referenciam `iw-gold`/`iw-navy`, não o hex
literal):

```css
--color-iw-navy:    #0D0D0D;   /* preto institucional CETADP */
--color-iw-gold:    #CF8403;   /* dourado institucional CETADP */
```

Adicionar os 2 tokens auxiliares definidos no manual (ainda não existem):

```css
--color-iw-neutro-claro: #F7F4ED;
--color-iw-cinza-texto:  #4A4A4A;
```

Atualizar o comentário de cabeçalho do arquivo (linha 6) de
`Paleta extraída do logo oficial (2026-06-15)` para
`Paleta oficial CETADP — Manual de Identidade Visual v1.0 (2026-09)`.

**Não mexer** em `--color-iw-blue`/`--color-iw-sky` (ação/botões) — o manual
não define cor de ação para UI, só cores de marca; manter os azuis
existentes evita quebrar o significado semântico de "ação primária" já
usado em toda a base de código.

**Validação da Fase 4:**
```powershell
cd C:\Projetos\portal-teologico-os-staging
npx tsc --noEmit
npm run dev
```
Abrir `http://localhost:3000` e conferir visualmente: cabeçalho, botões
dourados (`bg-iw-gold`), textos em preto (`text-iw-navy`) devem mudar de
tom (mais saturado/alaranjado no dourado, mais neutro no preto). Comparar
lado a lado com a página institucional (`/sobre`) e o rodapé.

---

## 5. COMO aplicar a tipografia oficial

Arquivo: `src/app/[locale]/layout.tsx` (linhas 2, 10–19).

Trocar:
```ts
import { Inter, Merriweather } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});
```
por:
```ts
import { Cinzel, Source_Sans_3 } from "next/font/google";

const sourceSans = Source_Sans_3({
  variable: "--font-inter",           // mantém o nome da variável CSS — zero mudança em globals.css
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const cinzel = Cinzel({
  variable: "--font-merriweather",    // idem — mantém o nome da variável CSS
  subsets: ["latin"],
  weight: ["600", "700"],
});
```
E trocar as referências `inter`/`merriweather` mais abaixo no arquivo
(no `className` do `<html>` ou `<body>`) pelos novos nomes `sourceSans`/`cinzel`.

Manter os nomes de variável CSS (`--font-inter`, `--font-merriweather`)
evita qualquer edição em `globals.css` (linhas 67 e 73 já apontam para essas
variáveis) — só o conteúdo da fonte muda, não o encanamento.

**Validação da Fase 5:**
```powershell
npx tsc --noEmit
npm run dev
```
Conferir visualmente: títulos (`h1`–`h6`) devem aparecer em Cinzel (serifada,
mais formal/clássica que Merriweather); corpo do texto em Source Sans 3.

---

## 6. COMO integrar o logo oficial (`src/components/Logo.tsx`)

O componente atual (`Logo.tsx`) já é a fonte única do logo em todo o
portal, mas só troca a cor do "selo" de fundo por `variant` — não troca o
arquivo de imagem. Para usar as 3 assinaturas do manual (colorida / fundo
escuro / monocromática) de verdade, estender o componente:

```tsx
const LOGO_SRC: Record<NonNullable<LogoProps["variant"]>, string> = {
  dark: "/branding/logos/logo-colorida.svg",       // selo navy sólido → fundo claro
  light: "/branding/logos/logo-fundo-escuro.svg",  // selo translúcido → fundo escuro
};
```
E trocar `src="/logo.png"` (linha 61 atual) por `src={LOGO_SRC[variant]}`.

Isso é uma correção de fundo: hoje `variant="light"` (usado sobre fundos
escuros, ex. header) continua carregando o MESMO arquivo colorido para
fundo claro — o manual proíbe isso explicitamente (capítulo 09, "Não use a
versão principal sobre... fundos muito detalhados/escuros").

Manter o fallback `GraduationCap` em caso de erro de carregamento (já
existe, linha 44/58–70) — não remover, é a rede de segurança contra tela
quebrada.

**Validação da Fase 6:**
```powershell
npx tsc --noEmit
```
Depois, visualmente: abrir o header público (fundo claro → deve puxar
`logo-colorida.svg`) e a tela de login, se tiver fundo escuro (deve puxar
`logo-fundo-escuro.svg`). Testar renomeando temporariamente um dos 2
arquivos e confirmar que o fallback `GraduationCap` aparece sem quebrar o
layout.

---

## 7. COMO aplicar o favicon oficial

Mecanismo do Next.js App Router (já documentado em `DESIGN_SYSTEM.md`,
seção 4) — arquivos com nome reservado direto em `src/app/`:

```powershell
$origem = "C:\Users\joaqu\Downloads\CETADP\Identidade_Visual_CETADP\04_Simbolo_e_Favicon"
Copy-Item "$origem\favicon.ico"                     "C:\Projetos\portal-teologico-os-staging\src\app\favicon.ico" -Force
Copy-Item "$origem\Simbolo_Colorido_512x512.png"    "C:\Projetos\portal-teologico-os-staging\src\app\icon.png"
Copy-Item "$origem\Simbolo_Colorido_180x180.png"    "C:\Projetos\portal-teologico-os-staging\src\app\apple-icon.png"
```

**Validação da Fase 7:** `npm run dev`, abrir `http://localhost:3000` e
checar a aba do navegador (favicon deve mudar para o símbolo do leão).
Testar também "Adicionar à tela de início" num celular ou o inspetor de
`<head>` do navegador para confirmar `apple-touch-icon`.

---

## 8. COMO alinhar o PDF de matrícula à paleta oficial

O gerador de PDF (`src/utils/pdf/matricula.ts`) usa cores hardcoded em
`rgb()` que **não vêm de nenhum token** — nem da paleta antiga, nem da
oficial:

```ts
const navy = rgb(0.05, 0.09, 0.2);   // não corresponde a #111111 nem a #0D0D0D
const gold = rgb(0.55, 0.42, 0.09);  // não corresponde a #C5A059 nem a #CF8403
```

Substituir pelos valores oficiais convertidos para escala 0–1 (`rgb(R/255, G/255, B/255)`):
```ts
const navy = rgb(0x0D / 255, 0x0D / 255, 0x0D / 255);   // #0D0D0D
const gold = rgb(0xCF / 255, 0x84 / 255, 0x03 / 255);   // #CF8403
```

**Validação da Fase 8:** gerar uma matrícula de teste em staging e abrir o
PDF — cabeçalho e títulos de seção devem sair no dourado `#CF8403` (mais
alaranjado que o atual) e o texto principal no preto `#0D0D0D`.

---

## 9. COMO governar a identidade visual daqui pra frente

Regras a registrar (e a aplicar já hoje, revisando qualquer PR novo):

1. Nenhum componente usa hex solto — sempre os tokens `iw-*` do `@theme`.
2. Nenhum componente importa fonte além de `Cinzel`/`Source Sans 3`
   (via as variáveis já expostas em `globals.css`).
3. Nenhuma tela importa `<img src="/logo...">` diretamente — sempre
   `import Logo from "@/components/Logo"`.
4. Antes de qualquer impressão institucional (gráfica), validar prova de
   cor física — Pantone não foi homologado (manual, capítulo 06).
5. Toda peça nova (banner, certificado, apresentação) segue a área de
   proteção mínima (1/8 da largura do medalhão central) e o tamanho mínimo
   (240px digital / 35mm impresso / 32px símbolo) do manual, capítulos 04–05.

Auditoria automática semanal: **não implementada nesta fase** — exigiria um
script de lint customizado (ex.: grep por hex fora de `globals.css`) rodando
via GitHub Actions agendado. Ficou fora do escopo deste blueprint por não
haver, hoje, infraestrutura de CI agendado no repositório (`ci.yml` só roda
em PR). Se for prioridade, é uma Fase 10 à parte — avisar antes de criar.

---

## 10. COMO registrar no documento institucional

`Governanca_Global_ConnectionCyberOS.md` existe em
`C:\Projetos\portal-teologico-os-staging\`. A versão `.html` mencionada no
pedido **não foi localizada** nas pastas às quais tenho acesso — antes de
inserir o capítulo nos dois arquivos, confirme o caminho do `.html` (ou se
ele ainda precisa ser gerado a partir do `.md`).

Capítulo a inserir no `.md` (posição sugerida: final do documento, como
novo capítulo numerado):

```markdown
## Capítulo N: Identidade Visual Institucional CETADP — Blueprint Global

Fonte oficial: Manual de Identidade Visual CETADP v1.0 (setembro/2026).
Ativos em `public/branding/`. Tokens de cor e tipografia em
`src/app/globals.css` (`@theme`). Componente único de logo:
`src/components/Logo.tsx`. Ver `BLUEPRINT_IDENTIDADE_VISUAL_CETADP.md`
para o histórico completo de implementação e decisões técnicas.

Paleta oficial: dourado `#CF8403`, preto `#0D0D0D`, branco `#FFFFFF`.
Tipografia oficial: Cinzel (títulos), Source Sans 3 (corpo).
Pantone não homologado — exigir prova de cor antes de qualquer impressão.
```

---

## SEQUÊNCIA DE EXECUÇÃO RECOMENDADA

1. Fase 2 + 3 (pastas + cópia de arquivos) — sem risco, reversível.
2. Fase 7 (favicon) — impacto visual mínimo e isolado, bom teste de fumaça.
3. Fase 6 (logo) — impacto visual localizado (header/footer/login).
4. Fase 4 + 5 (cores + tipografia globais) — maior impacto visual, fazer
   por último e revisar tela por tela antes de decidir merge pra produção.
5. Fase 8 (PDF) — independente das anteriores, pode ser feita em paralelo.
6. Fase 9 + 10 (governança + documento institucional) — depois que as
   fases técnicas estiverem validadas e aprovadas visualmente.

Cada fase termina com `npx tsc --noEmit` limpo antes de avançar para a
próxima — nenhuma fase depende de pular validação da anterior.
