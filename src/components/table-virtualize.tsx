'use client'
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import {
  useInfiniteQuery,
  keepPreviousData
} from '@tanstack/react-query'
import { useVirtual } from 'react-virtual'
import { fetchData, Person, PersonApiResponse } from '@/dummy/makeData'
import { Input } from './ui/input'

const TableVirtualize = () => {
  const fetchSize = 100
  const renderer = useReducer(() => ({}), {})[1]
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalValue, setGlobalValue] = useState<string>('')

  const column = useMemo<ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 60,
      },
      {
        accessorKey: 'firstName',
        cell: info => info.getValue(),
      },
      {
        accessorFn: row => row.lastName,
        id: 'lastName',
        cell: info => info.getValue(),
        header: () => <span>Last Name</span>,
      },
      {
        accessorKey: 'age',
        header: () => 'Age',
        size: 50,
      },
      {
        accessorKey: 'visits',
        header: () => <span>Visits</span>,
        size: 50,
      },
      {
        accessorKey: 'status',
        header: 'Status',
      },
      {
        accessorKey: 'progress',
        header: 'Profile Progress',
        size: 80,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: info => info.getValue<Date>().toLocaleString(),
      },
    ], []
  )

  const {data, fetchNextPage, isFetching, isLoading} = useInfiniteQuery<PersonApiResponse>(
    {
      queryKey: ['table-data', sorting],
      queryFn: async ({ pageParam = 0}:any) => {
        const start = pageParam * fetchSize
        const fetchedData = fetchData(start, fetchSize, sorting)
        return fetchedData
      },
      initialPageParam: 0,
      getNextPageParam: (_lastGroup, groups) => groups.length,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: true
    }
  )

  const flatData = useMemo(() => data?.pages?.flatMap(page => page.data) ?? [], [data])
  const totalDbCount = data?.pages?.[0].meta.totalRowCount ?? 0
  const totalFetched = flatData.length

  const fetchOnBottomReach = useCallback((containerRefElement?:HTMLDivElement | null) => {
    if(containerRefElement) {
      const {scrollTop, scrollHeight, clientHeight} = containerRefElement
      if(scrollHeight - scrollTop - clientHeight < 300 &&!isFetching && totalFetched < totalDbCount){
        fetchNextPage()
      }
    }
  }, [fetchNextPage, isFetching, totalFetched, totalDbCount])

  useEffect(() => {
    fetchOnBottomReach(tableContainerRef.current)
  }, [fetchOnBottomReach])

  const table = useReactTable({
    data:flatData,
    columns:column,
    state: {
      sorting,
      globalFilter: globalValue
    },
    onSortingChange:setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalValue,
    debugTable: true,
  })

  const {rows} = table.getRowModel()
  const rowVirtualizer = useVirtual({
    parentRef: tableContainerRef,
    size: rows.length,
    overscan: 10,
  })
  
  const { virtualItems: virtualRows, totalSize } = rowVirtualizer
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
      : 0

  if (isLoading) {
    return <>Loading...</>
  }

  return (
      <div className="p-2">
        <Input
          placeholder='Search all columns...'
          className='max-w-[250px]'
          value={globalValue ?? ''}
          onChange={(e) => {
            setGlobalValue(e.target.value)
          }}
        />
        <div className="h-4" />
        <div
          className="border  max-h-[500px] max-w-screen overflow-auto"
          onScroll={e => fetchOnBottomReach(e.target as HTMLDivElement)}
          ref={tableContainerRef}
        >
          <table className='border-separate border-spacing-0 table-fixed w-full'>
            <thead className='sticky bg-white dark:bg-black top-0 w-full'>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{ width: header.getSize() }}
                        className='border-b border-r p-1 text-left'
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none'
                                : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td className='p-2' style={{ height: `${paddingTop}px` }} />
                </tr>
              )}
              {virtualRows.map(virtualRow => {
                const row = rows[virtualRow.index] as Row<Person>
                return (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => {
                      return (
                        <td key={cell.id} className='p-2'>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td className='p-2' style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div>
          Fetched {flatData.length} of {totalDbCount} Rows.
        </div>
        <div>
          <button onClick={() => renderer()}>Force Rerender</button>
        </div>
      </div>
  )
}

export default TableVirtualize