import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MapApp from './MapApp'
import { MethodologyIndex } from '@/components/methodology/MethodologyIndex'
import { CriterionDetailPage } from '@/components/methodology/CriterionDetailPage'

/**
 * Application router.
 *
 *   /                       → live map (the bulk of the product)
 *   /methodology            → index of all criteria, grouped by category
 *   /methodology/:id        → per-criterion detail with sourcing + dates
 *
 * BrowserRouter is fine for static hosting (Cloudflare Pages, Vercel) once
 * a SPA fallback is configured. In dev Vite handles the fallback itself.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapApp />} />
        <Route path="/methodology" element={<MethodologyIndex />} />
        <Route path="/methodology/:id" element={<CriterionDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
