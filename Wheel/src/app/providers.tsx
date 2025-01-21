'use client'

import { ChakraProvider } from '@chakra-ui/react'

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <ChakraProvider>{children}</ChakraProvider>
  )
}