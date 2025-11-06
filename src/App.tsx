import './App.css'
import RichTextEditor from './components/RichTextEditor'
import MarkdownToRtf from './components/MarkdownToRtf'

function App() {
  return (
    <main className="app">
      <header>
        <h1>마크다웅을 RTF 형식으로 </h1>
      </header>

      <RichTextEditor />

      {/* <MarkdownToRtf /> */}
    </main>
  )
}

export default App
