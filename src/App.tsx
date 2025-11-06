import './App.css'
import RichTextEditor from './components/RichTextEditor'

function App() {
  // 주석
  return (
    <main className="app">
      <header>
        <h1>마크다웅을 RTF 형식으로 </h1>
      </header>

      <RichTextEditor />
    </main>
  )
}

export default App
