import { Helmet } from 'react-helmet-async';
import HomePage from './pages/HomePage';

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': 'AccountingService',
  name: 'Dev Patel and Associates',
  image: '/Logo.webp',
  email: 'pateldevendra123@gmail.com',
  telephone: '+918369893433',
  address: {
    '@type': 'PostalAddress',
    streetAddress:
      'Office no. 1, Basement, Tejaswini Apartments, opp. Mumbai University, Mhada Colony, Vidya Nagari, Kalina, Santacruz East',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400098',
    addressCountry: 'IN',
  },
  areaServed: 'Mumbai',
  serviceType: [
    'Income Tax Advisory',
    'GST Compliance',
    'Accounting and Bookkeeping',
    'ROC Compliance',
    'Business Advisory',
  ],
};

export default function App() {
  return (
    <>
      <Helmet>
        <title>
          Dev Patel and Associates | Tax Consultant in Kalina, Mumbai
        </title>
        <meta
          name="description"
          content="Experienced tax, GST, accounting, ROC compliance and business advisory support for individuals, founders and businesses in Kalina, Santacruz East, Mumbai."
        />
        <meta
          name="keywords"
          content="tax consultant Kalina, GST consultant Mumbai, income tax filing Santacruz East, accounting services Mumbai, ROC compliance Mumbai"
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Dev Patel and Associates | Tax Consultant in Kalina, Mumbai"
        />
        <meta
          property="og:description"
          content="Reliable tax, accounting and compliance support for individuals, entrepreneurs and businesses."
        />
        <meta property="og:image" content="/dev-patel-hero.png" />
        <script type="application/ld+json">
          {JSON.stringify(businessSchema)}
        </script>
      </Helmet>
      <HomePage />
    </>
  );
}
