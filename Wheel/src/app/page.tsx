'use client'
 
import { Link } from '@chakra-ui/next-js';
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  
  return (
      <Link href='/wheel' color='blue.400' _hover={{ color: 'blue.500' }}>
        Wheel
      </Link>
  );
}
