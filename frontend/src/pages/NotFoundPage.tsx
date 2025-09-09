import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="min-h-full flex flex-col justify-center items-center py-12">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">Page not found</h2>
        <p className="mt-2 text-base text-gray-500">Sorry, we couldn't find the page you're looking for.</p>
        <div className="mt-6">
          <Link to="/dashboard" className="btn-primary">
            Go back home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage