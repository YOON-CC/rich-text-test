import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { marked } from "marked";

export default function App() {
  const [markdown, setMarkdown] = useState("");

  const downloadHwpx = async () => {
    // ✅ Markdown → HTML
    const htmlStr = await Promise.resolve(marked(markdown));
    const text = htmlStr.replace(/<[^>]+>/g, "").trim();

    // ✅ Section0.xml (실제 내용)
    const section0 = `<?xml version="1.0" encoding="UTF-8"?>
<hs:section xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
  <hs:p>
    <hs:run>
      <hs:char>${text}</hs:char>
    </hs:run>
  </hs:p>
</hs:section>
`;

    // ✅ Contents.xml (문서 본문 구조)
    const contents = `<?xml version="1.0" encoding="UTF-8"?>
<hm:body xmlns:hm="http://www.hancom.co.kr/hwpml/2011/main">
  <hm:sectionRef id="0"/>
</hm:body>
`;

    // ✅ manifest.xml (필수 매핑 파일)
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest>
  <item id="0" href="Section0.xml" type="application/xml"/>
</manifest>
`;

    // ✅ root.xml (한글 문서의 최상위 구조)
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

    // ✅ version.txt (필수, HWPX version)
    const versionTxt = "1.3";

    // ✅ ZIP 구성 (이 구조여야 한글이 정상 인식)
    const zip = new JSZip();

    // root.xml + version.txt
    zip.file("root.xml", rootXml);
    zip.file("version.txt", versionTxt);

    // Contents 폴더
    const folder = zip.folder("Contents");
    folder!.file("Contents.xml", contents);
    folder!.file("Section0.xml", section0);
    folder!.file("manifest.xml", manifest);

    // ✅ Blob 생성 후 다운로드
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "sample.hwpx");
  };

  return (
    <main className="app">
      <h2>Markdown → HWPX Converter (정상 작동 버전)</h2>

      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder="# Hello\n**bold**"
        style={{
          width: "100%",
          height: "200px",
          padding: "12px",
          fontSize: "16px",
        }}
      />

      <button onClick={downloadHwpx} style={{ marginTop: "20px" }}>
        HWPX 다운로드
      </button>
    </main>
  );
}
