'use client'
import TableVirtualize from '@/components/table-virtualize'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function Home() {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <TableVirtualize/>
    </QueryClientProvider>
  )
}
