import { LogOut } from 'lucide-react'
import { Modal } from './UI'
import { useApp } from '../context/AppContext'

/* Dritarja e konfirmimit para daljes nga llogaria */
export function LogoutConfirmModal({ onClose, onConfirm }) {
  return (
    <Modal
      title={<span className="flex items-center gap-2"><LogOut size={18} className="text-red-500 dark:text-[#ffb4ab]" />Dil nga llogaria</span>}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={onConfirm}>Po, dil</button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Jeni i sigurt që dëshironi të dilni nga llogaria? Do t'ju duhet të kyçeni përsëri për të vazhduar.
      </p>
    </Modal>
  )
}

/* Kthen një funksion që hap konfirmimin dhe, pasi pranohet, e nxjerr përdoruesin jashtë */
export function useConfirmLogout() {
  const { setModal, closeModal, logout } = useApp()
  return () => setModal(
    <LogoutConfirmModal
      onClose={closeModal}
      onConfirm={() => { closeModal(); logout() }}
    />
  )
}
