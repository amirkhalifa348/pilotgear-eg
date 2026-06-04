import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isAdminAuthed } from '../data/store'
import AdminLogin from './AdminLogin'
import AdminLayout from './AdminLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductEditor from './pages/ProductEditor'
import Collections from './pages/Collections'
import Orders from './pages/Orders'
import Messages from './pages/Messages'
import Inventory from './pages/Inventory'
import PageBuilder from './pages/PageBuilder'
import Settings from './pages/Settings'

export default function AdminApp() {
  const [authed, setAuthed] = useState(isAdminAuthed())
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />
  return (
    <Routes>
      <Route element={<AdminLayout onLogout={() => setAuthed(false)} />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductEditor />} />
        <Route path="products/:id" element={<ProductEditor />} />
        <Route path="collections" element={<Collections />} />
        <Route path="orders" element={<Orders />} />
        <Route path="messages" element={<Messages />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="pages" element={<PageBuilder />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
