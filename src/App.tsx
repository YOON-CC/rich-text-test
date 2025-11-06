import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { marked } from "marked";

/** XML 특수문자 이스케이프 */
function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 한 글자당 <hs:char> 로 쪼개기 (HWPX에서 텍스트 깨짐 방지 핵심) */
function toCharNodes(text: string) {
  return text
    .split("")
    .map((ch) => `<hs:char>${xmlEscape(ch)}</hs:char>`)
    .join("");
}

/** HTML을 파싱해서 h1~h6(제목) 위주로 Section0.xml 본문을 만든다 */
function htmlToSectionXml(html: string) {
  // 브라우저에서 DOMParser 사용 (React 환경에서 동작)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.childNodes);

  const paragraphs: string[] = [];

  nodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // 제목만 우선 처리 (h1~h6)
      if (/^h[1-6]$/.test(tag)) {
        const text = el.textContent ?? "";
        // 앞으로 스타일 적용(h1 크기, bold 등)을 위해 level만 계산해 둔다
        // const level = Number(tag.substring(1)); // 1~6

        // 현재 단계: 안전하게 텍스트만 출력 (스타일은 다음 단계에서)
        const run = `<hs:run>${toCharNodes(text)}</hs:run>`;

        // 문단(p) 하나 생성
        const p = `<hs:p>${run}</hs:p>`;

        paragraphs.push(p);
      }

      // (선택) 일반 문단도 보여주고 싶다면 여기를 켜세요.
      // else if (tag === "p") {
      //   const text = el.textContent ?? "";
      //   const run = `<hs:run>${toCharNodes(text)}</hs:run>`;
      //   const p = `<hs:p>${run}</hs:p>`;
      //   paragraphs.push(p);
      // }
    }
  });

  // 만약 제목이 하나도 없으면 안내 문장 하나라도 넣자 (빈 문서 방지)
  if (paragraphs.length === 0) {
    paragraphs.push(
      `<hs:p><hs:run>${toCharNodes(
        "제목(h1~h6)이 없어서 빈 문단을 넣었습니다."
      )}</hs:run></hs:p>`
    );
  }

  // Section0.xml 완성 (네임스페이스: section)
  const section0 = `<?xml version="1.0" encoding="UTF-8"?>
<hs:section xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
  ${paragraphs.join("\n  ")}
</hs:section>
`;
  return section0;
}

export default function App() {
  const [markdown, setMarkdown] = useState<string>("# Hello\n\n## Sub Title");

  const downloadHwpx = async () => {
    // 1) Markdown -> HTML
    const htmlStr = await Promise.resolve(marked(markdown));

    // 2) HTML -> Section0.xml (제목만 우선 변환)
    const section0 = htmlToSectionXml(htmlStr);

    // 3) HWPX 필수 파일들
    const contentsXml = `<?xml version="1.0" encoding="UTF-8"?>
<hm:body xmlns:hm="http://www.hancom.co.kr/hwpml/2011/main">
  <hm:sectionRef id="0"/>
</hm:body>
`;

    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest>
  <item id="0" href="Section0.xml" type="application/xml"/>
</manifest>
`;

    const rootXml = `<?xml version="1.0" encoding="UTF-8"?>
<hwpml xmlns="http://www.hancom.co.kr/hwpml/2011/main">
  <head>
    <meta name="generator" content="React-HWPX-Converter"/>
  </head>
  <body>
    <sectionRef id="0"/>
  </body>
</hwpml>
`;

    const versionTxt = "1.3";

    // 4) ZIP(HWPX) 구성
    const zip = new JSZip();
    zip.file("root.xml", rootXml);
    zip.file("version.txt", versionTxt);

    const folder = zip.folder("Contents");
    folder!.file("Contents.xml", contentsXml);
    folder!.file("Section0.xml", section0);
    folder!.file("manifest.xml", manifestXml);

    // 5) 다운로드
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "sample.hwpx");
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h2>Markdown → HWPX (제목 우선)</h2>

      <p style={{ color: "#666", marginTop: -8 }}>
        h1~h6 제목을 HWPX 문단으로 변환합니다. (스타일은 다음 단계에서 추가)
      </p>

      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder={`# 제목1\n\n## 제목2\n\n일반 문장...`}
        style={{
          width: "100%",
          height: 200,
          padding: 12,
          fontSize: 14,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
        }}
      />

      <button
        onClick={downloadHwpx}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        HWPX 다운로드
      </button>
    </main>
  );
}
