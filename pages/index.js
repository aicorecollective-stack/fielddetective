import dynamic from 'next/dynamic'
import Head from 'next/head'

// Leaflet needs browser — load dynamically
const App = dynamic(() => import('../components/App'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>FieldDetective</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <meta name="description" content="Metal detecting companion app with AI identification, GPS tracking and historical maps"/>
      </Head>
      <App />
    </>
  )
}
