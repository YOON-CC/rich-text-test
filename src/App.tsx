import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { marked } from "marked";

export default function App() {
  const [markdown, setMarkdown] = useState("");

  const downloadHwpx = async () => {
    // Markdown → HTML
    const html = marked(markdown);

    // HTML → HWPX 변환 (지금은 텍스트만 넣는 MVP)
    const htmlStr = await Promise.resolve(html); // Ensure html is a string, in case marked returns a Promise
    const text = htmlStr.replace(/<[^>]+>/g, ""); // HTML 태그 제거 (MVP)

    const section0 = `
<?xml version="1.0" encoding="UTF-8"?>
<hm:section xmlns:hm="http://www.hancom.co.kr/hwpml/2011/main">
  <hm:p>
    <hm:run>
      <hm:char>${text}</hm:char>
    </hm:run>
  </hm:p>
</hm:section>
`;

    const contents = `
<?xml version="1.0" encoding="UTF-8"?>
<hm:body xmlns:hm="http://www.hancom.co.kr/hwpml/2011/main">
  <hm:sectionRef id="1"/>
</hm:body>
`;

    const manifest = `
<?xml version="1.0" encoding="UTF-8"?>
<manifest>
  <item id="1" href="Section0.xml" type="application/xml"/>
</manifest>
`;

    const zip = new JSZip();
    const folder = zip.folder("Contents");
    folder?.file("Section0.xml", section0);
    folder?.file("Contents.xml", contents);
    folder?.file("manifest.xml", manifest);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "sample.hwpx");
  };

  return (
    <main className="app">
      <h2>Markdown → HWPX Converter (MVP)</h2>

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
