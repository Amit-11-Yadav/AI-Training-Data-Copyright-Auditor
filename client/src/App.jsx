import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Results from './pages/Results.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/audit/:id" element={<Results />} />
    </Routes>
  )
}
