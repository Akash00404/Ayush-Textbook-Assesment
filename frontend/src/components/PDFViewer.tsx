import React from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface PdfViewerProps {
  fileUrl: string
  pageNumber: number
  onLoadSuccess: ({ numPages }: { numPages: number }) => void
  width?: number
}

const PDFViewer: React.FC<PdfViewerProps> = ({ fileUrl, pageNumber, onLoadSuccess, width = 600 }) => {
  const authState = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null
  let authHeader: Record<string, string> | undefined
  if (authState) {
    try {
      const parsed = JSON.parse(authState)
      const token = parsed?.state?.token ?? parsed?.token
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` }
      }
    } catch {}
  }
  return (
    <Document
      file={{ url: fileUrl, httpHeaders: authHeader }}
      onLoadSuccess={onLoadSuccess}
      loading={
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      }
      error={
        <div className="flex flex-col justify-center items-center h-96 text-center p-4">
          <p className="text-red-500 font-medium">Failed to load PDF</p>
          <p className="text-gray-500 mt-2">There was an error loading the document.</p>
        </div>
      }
    >
      <Page
        pageNumber={pageNumber}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        width={width}
      />
    </Document>
  )
}

export default PDFViewer


