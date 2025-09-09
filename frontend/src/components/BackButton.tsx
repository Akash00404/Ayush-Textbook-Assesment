import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
  fallbackPath?: string
  label?: string
}

const BackButton = ({ fallbackPath = '/dashboard', label = 'Back' }: BackButtonProps) => {
  const navigate = useNavigate()
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallbackPath)
    }
  }
  return (
    <button type="button" onClick={handleBack} className="btn-outline py-1 px-3">
      {label}
    </button>
  )
}

export default BackButton


