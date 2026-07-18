import { Inter, Noto_Sans, Noto_Sans_Sinhala } from 'next/font/google'
 
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const notoSans = Noto_Sans_Sinhala({
  subsets: ['latin', 'sinhala'],
  display: 'swap',
})
