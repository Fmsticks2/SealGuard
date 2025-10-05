import { Routes, Route } from 'react-router-dom'
import AppKitProvider from './providers'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import './index.css'

function App() {
  return (
    <AppKitProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          {/* Add a catch-all route for 404 */}
          <Route path="*" element={<div className="container mx-auto px-4 py-20 text-center"><h1 className="text-2xl font-bold">Page Not Found</h1><p className="text-gray-600 mt-2">The page you're looking for doesn't exist.</p></div>} />
        </Route>
      </Routes>
    </AppKitProvider>
  )
}

export default App