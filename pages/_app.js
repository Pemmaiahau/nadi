import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Nadi Jyotish — Bhrigu Nadi & Birth Time Rectification</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Swiss Ephemeris sidereal charts, 150-part Nadi Amsha resolution, Bhrigu Nadi planet-link readings and an interactive birth time rectification dashboard."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
