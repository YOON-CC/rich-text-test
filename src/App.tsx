import './App.css'
import RichTextEditor from './components/RichTextEditor'

function App() {
  return (
    <main className="app">
      <header>
        <p className="tag">TipTap · React · TypeScript</p>
        <h1>리치 텍스트 에디터</h1>
        <p className="description">
          TipTap은 React 생태계에서 널리 사용하는 확장 가능한 리치 텍스트 에디터입니다. 아래 편집기를
          활용해 다양한 서식을 적용해 보세요.
        </p>
      </header>

      <RichTextEditor />
    </main>
  )
}

export default App
