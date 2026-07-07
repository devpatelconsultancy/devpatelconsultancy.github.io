import { MotionConfig, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardCheck,
  FileSearch,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ReceiptText,
  Scale,
  ShieldCheck,
  Target,
  UserRoundSearch,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const devPhoto = `${import.meta.env.BASE_URL}dev-patel-consultancy-hero.png`;
const phoneHref = 'tel:+918369893433';
const whatsappHref = 'https://wa.me/918369893433';
const email = 'pateldevendra123@gmail.com';
const emailHref =
  'mailto:pateldevendra123@gmail.com?subject=Consultation%20request%20for%20Dev%20Patel%20Consultancy';

const navLinks = [
  ['Home', '#top'],
  ['About', '#about'],
  ['Services', '#services'],
  ['Expertise', '#expertise'],
  ['Process', '#process'],
  ['Resources', '#resources'],
  ['Contact', '#contact'],
];

const headerHeightClass = 'h-[98px]';

const heroExpertise = [
  {
    icon: FileText,
    title: 'Experts in GST Demand & Notice Compliance',
  },
  {
    icon: UserRoundSearch,
    title: 'Income Tax Notices',
  },
  {
    icon: BarChart3,
    title: 'Tax Planning & Business Consulting',
  },
];

const expertise = [
  {
    icon: ReceiptText,
    title: 'GST Demand & Notice Compliance',
    text: 'Expert representation, reply drafting, document strategy and resolution.',
  },
  {
    icon: UserRoundSearch,
    title: 'Income Tax Notices',
    text: "Assessment, scrutiny, search or any notice - we've got you covered.",
  },
  {
    icon: Target,
    title: 'Tax Planning & Business Consulting',
    text: 'Proactive planning and business advisory to reduce tax outgo and drive growth.',
  },
];

const process = [
  {
    icon: FileSearch,
    title: 'Understand',
    text: 'We analyse your case, documents and notice in detail.',
  },
  {
    icon: ClipboardCheck,
    title: 'Strategize',
    text: 'Our experts design the right approach and prepare a strong case.',
  },
  {
    icon: ArrowRight,
    title: 'Represent',
    text: 'We handle replies, representation and follow-ups.',
  },
  {
    icon: Check,
    title: 'Resolve',
    text: 'Focused on best possible outcome and future readiness.',
  },
];

const serviceColumns = [
  [
    {
      icon: ShieldCheck,
      title: 'GST Advisory & Compliance',
      text: 'Registration, returns, reconciliation, audits and advisory.',
    },
    {
      icon: ReceiptText,
      title: 'GST Notice & Demand Handling',
      text: 'SCN replies, personal hearings, appeals and litigation support.',
    },
    {
      icon: BriefcaseBusiness,
      title: 'Business Consulting',
      text: 'Structuring, expansion, compliance systems and risk advisory.',
    },
  ],
  [
    {
      icon: FileText,
      title: 'Income Tax Compliance',
      text: 'ITR filing, TDS, advance tax, book review and more.',
    },
    {
      icon: FileSearch,
      title: 'Income Tax Notice Handling',
      text: 'Scrutiny, assessment, search, reassessment and appeals.',
    },
    {
      icon: BarChart3,
      title: 'Financial & MIS Advisory',
      text: 'Reporting, budgeting, costing and decision support.',
    },
  ],
  [
    {
      icon: Scale,
      title: 'Tax Planning',
      text: 'Proactive tax planning for individuals and businesses.',
    },
    {
      icon: Landmark,
      title: 'Representation & Litigation',
      text: 'Before department, authorities and appellate forums.',
    },
    {
      icon: Building2,
      title: 'Startup & MSME Advisory',
      text: 'Registrations, incentives, fundraising and compliance advisory.',
    },
  ],
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <a href="#top" className="flex items-center gap-3" aria-label="Dev Patel Consultancy">
      <span className="relative grid size-12 place-items-center font-display text-3xl font-extrabold text-[#0c2a32]">
        <span className={light ? 'text-white' : 'text-[#0c2a32]'}>D</span>
        <span className="absolute left-7 top-4 text-3xl text-[#c99a42]">P</span>
      </span>
      <span className="leading-none">
        <span
          className={`block font-display text-[1.35rem] font-extrabold uppercase tracking-[0.11em] ${
            light ? 'text-white' : 'text-[#102832]'
          }`}
        >
          Dev Patel
        </span>
        <span className="block text-[0.68rem] font-bold uppercase tracking-[0.38em] text-[#c99a42]">
          Consultancy
        </span>
      </span>
    </a>
  );
}

function NewNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 border-b border-[#e6ebe9] bg-white/96 shadow-[0_10px_34px_rgba(15,39,45,0.05)] backdrop-blur-xl ${headerHeightClass}`}>
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-full max-w-7xl items-center justify-between gap-5 px-5 lg:px-8"
        >
          <BrandMark />
          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map(([label, href], index) => (
              <a
                key={label}
                href={href}
                className={`border-b-2 py-2 text-sm font-bold transition ${
                  index === 0
                    ? 'border-[#102832] text-[#102832]'
                    : 'border-transparent text-[#273c42] hover:border-[#c99a42] hover:text-[#102832]'
                }`}
              >
                {label}
              </a>
            ))}
          </div>
          <a
            href={phoneHref}
            className="hidden items-center gap-3 rounded-sm bg-[#071f2d] px-6 py-4 text-sm font-bold text-white shadow-[0_16px_35px_rgba(7,31,45,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0a3a44] lg:inline-flex"
          >
            Book Consultation
            <ArrowRight size={17} className="text-[#c99a42]" />
          </a>
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="grid size-11 place-items-center rounded-sm border border-[#dce5e2] bg-white text-[#102832] lg:hidden"
          >
            <Menu size={22} />
          </button>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] bg-white lg:hidden">
          <div className="flex min-h-svh flex-col p-5" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between">
              <BrandMark />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-sm border border-[#dce5e2]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-8 grid gap-2">
              {navLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[#e6ebe9] px-1 py-4 font-bold text-[#102832]"
                >
                  {label}
                </a>
              ))}
              <a
                href={phoneHref}
                onClick={() => setOpen(false)}
                className="mt-5 rounded-sm bg-[#071f2d] px-4 py-4 text-center font-bold text-white"
              >
                Book Consultation
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GoldRule() {
  return <span className="block h-0.5 w-12 bg-[#c99a42]" />;
}

export default function NewHomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <Helmet>
        <title>
          Dev Patel Consultancy | GST Demand, Income Tax Notices & Tax Planning
        </title>
        <meta
          name="description"
          content="Dev Patel Consultancy helps with GST demand and notice compliance, income tax notices, tax planning and business consulting with 10+ years of experience."
        />
        <meta
          name="keywords"
          content="GST demand notice consultant, income tax notice consultant, tax planning consultant, business consulting India, Dev Patel Consultancy"
        />
        <meta property="og:title" content="Dev Patel Consultancy" />
        <meta
          property="og:description"
          content="Clarity in tax, confidence in growth. GST demand compliance, income tax notices, tax planning and business consulting."
        />
        <meta property="og:image" content={devPhoto} />
      </Helmet>

      <div id="top" className="new-site min-h-screen bg-white font-sans text-[#102832]">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <NewNav />

        <main id="main-content">
          <section className="relative overflow-hidden border-b border-[#e6ebe9] bg-white pt-[98px]">
            <img
              src={devPhoto}
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 right-0 top-[98px] hidden h-[calc(100%-98px)] w-auto max-w-none lg:block"
            />
            <div className="absolute inset-y-0 left-0 hidden w-[55%] bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_76%,rgba(255,255,255,0.76)_91%,rgba(255,255,255,0)_100%)] lg:block" />
            <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,#ffffff_100%)] lg:block" />
            <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:min-h-[610px] lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
                className="relative z-10 flex max-w-[620px] flex-col justify-center py-12 lg:min-h-[610px] lg:py-14"
              >
                <h1 className="max-w-2xl font-display text-[3rem] font-extrabold leading-[1.05] text-[#082531] md:text-[4rem]">
                  Clarity in Tax.
                  <br />
                  Confidence in Growth.
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-8 text-[#3e5055]">
                  End-to-end tax compliance, notices handling, planning and business
                  consulting so you can focus on what you do best.
                </p>
                <div className="mt-8">
                  <GoldRule />
                </div>

                <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
                  {heroExpertise.map((item, index) => (
                    <motion.div
                      key={item.title}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.45, delay: 0.12 + index * 0.08 }}
                      className="flex items-start gap-3 border-r border-[#d9e0dd] pr-4 last:border-r-0"
                    >
                      <item.icon className="mt-1 shrink-0 text-[#0c6265]" size={30} />
                      <p className="text-sm font-extrabold leading-5 text-[#102832]">
                        {item.title}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href={phoneHref}
                    className="inline-flex items-center justify-center gap-3 rounded-sm bg-[#071f2d] px-7 py-4 text-sm font-extrabold text-white shadow-[0_16px_38px_rgba(7,31,45,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0a3a44]"
                  >
                    Book a Consultation
                    <ArrowRight size={18} className="text-[#c99a42]" />
                  </a>
                  <a
                    href="#services"
                    className="inline-flex items-center justify-center gap-3 rounded-sm px-6 py-4 text-sm font-extrabold text-[#102832] transition hover:text-[#0c6265]"
                  >
                    Explore Services
                    <ArrowRight size={17} />
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.75, delay: 0.05 }}
                className="relative z-10 -mx-5 flex items-end justify-center lg:hidden"
              >
                <img
                  src={devPhoto}
                  alt="Dev Patel at consultation desk"
                  className="aspect-[16/9] w-full object-cover object-center"
                />
              </motion.div>
            </div>
          </section>

          <section id="expertise" className="bg-[#fbfcfb] py-16 lg:py-20">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.32fr_0.68fr] lg:px-8">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55 }}
                className="flex items-start gap-5"
              >
                <span className="mt-2 h-10 w-0.5 bg-[#c99a42]" />
                <h2 className="font-display text-4xl font-extrabold leading-tight text-[#102832]">
                  Where Our Expertise Delivers
                </h2>
              </motion.div>
              <div className="grid gap-0 md:grid-cols-3">
                {expertise.map((item, index) => (
                  <motion.article
                    key={item.title}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.55, delay: index * 0.07 }}
                    className="border-l border-[#d9e0dd] px-8 py-2"
                  >
                    <item.icon className="text-[#0c6265]" size={48} />
                    <h3 className="mt-6 font-display text-2xl font-extrabold leading-tight text-[#102832]">
                      {item.title}
                    </h3>
                    <p className="mt-4 leading-7 text-[#506166]">{item.text}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          <section id="process" className="border-y border-[#e6ebe9] bg-white py-16 lg:py-20">
            <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.34fr_0.66fr] lg:px-8">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55 }}
                className="border-r border-[#d9e0dd] pr-8"
              >
                <h2 className="font-display text-4xl font-extrabold leading-tight text-[#102832]">
                  Experience. Process.
                  <br />
                  Results you can trust.
                </h2>
                <div className="mt-7">
                  <GoldRule />
                </div>
                <p className="mt-7 leading-8 text-[#506166]">
                  With 10+ years of hands-on experience, we combine deep technical
                  knowledge with a practical approach to deliver effective solutions.
                </p>
                <div className="mt-8 flex items-center gap-5 rounded-sm border border-[#cfd9d6] bg-white p-5">
                  <BadgeCheck className="shrink-0 text-[#0c6265]" size={54} />
                  <div>
                    <p className="font-display text-3xl font-extrabold text-[#102832]">
                      10+ Years
                    </p>
                    <p className="leading-6 text-[#506166]">
                      of professional experience in tax & business advisory.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-7 md:grid-cols-4">
                {process.map((item, index) => (
                  <motion.article
                    key={item.title}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.55, delay: index * 0.07 }}
                    className="relative text-center"
                  >
                    {index < process.length - 1 && (
                      <span className="absolute left-[58%] top-8 hidden w-[84%] border-t border-dashed border-[#9aa9a5] md:block" />
                    )}
                    <span className="relative mx-auto grid size-16 place-items-center rounded-full border-2 border-[#0c6265] bg-white text-[#0c6265]">
                      <item.icon size={28} />
                    </span>
                    <p className="mt-6 font-display text-xl font-extrabold text-[#102832]">
                      0{index + 1}
                    </p>
                    <h3 className="mt-3 font-display text-xl font-extrabold text-[#102832]">
                      {item.title}
                    </h3>
                    <p className="mt-4 leading-7 text-[#506166]">{item.text}</p>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          <section id="services" className="bg-[#fbfcfb] py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-5 lg:px-8">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55 }}
                className="mx-auto max-w-3xl text-center"
              >
                <h2 className="font-display text-4xl font-extrabold leading-tight text-[#102832]">
                  How We Can Help
                </h2>
                <p className="mt-4 text-lg text-[#506166]">
                  Comprehensive solutions for individuals, businesses and professional
                  firms.
                </p>
              </motion.div>

              <div className="mt-12 grid gap-8 lg:grid-cols-3">
                {serviceColumns.map((column, columnIndex) => (
                  <div
                    key={columnIndex}
                    className="grid gap-8 border-[#d9e0dd] lg:border-r lg:pr-8 lg:last:border-r-0"
                  >
                    {column.map((service) => (
                      <motion.article
                        key={service.title}
                        variants={fadeUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.55 }}
                        className="grid grid-cols-[52px_1fr] gap-5"
                      >
                        <span className="grid size-12 place-items-center rounded-full border border-[#d9e0dd] text-[#0c6265]">
                          <service.icon size={24} />
                        </span>
                        <div>
                          <h3 className="font-display text-lg font-extrabold text-[#102832]">
                            {service.title}
                          </h3>
                          <p className="mt-2 leading-6 text-[#506166]">
                            {service.text}
                          </p>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-3 rounded-sm border border-[#b9c5c1] bg-white px-7 py-4 text-sm font-extrabold text-[#102832] transition hover:border-[#c99a42] hover:text-[#0c6265]"
                >
                  View All Services
                  <ArrowRight size={17} className="text-[#c99a42]" />
                </a>
              </div>
            </div>
          </section>

          <section id="contact" className="relative overflow-hidden bg-[#003d42] py-14 text-white">
            <div className="absolute right-0 top-0 h-40 w-52 border-l border-t border-[#c99a42]/20" />
            <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.38fr_0.34fr_0.28fr] lg:items-center lg:px-8">
              <div>
                <h2 className="font-display text-4xl font-extrabold leading-tight">
                  Let&apos;s Resolve. Plan.
                  <br />
                  And Grow - Together.
                </h2>
                <div className="mt-7">
                  <GoldRule />
                </div>
                <p className="mt-7 max-w-md leading-8 text-white/78">
                  Book a confidential consultation with Dev Patel and get clear
                  guidance for your tax or business challenges.
                </p>
              </div>
              <div className="grid gap-6 border-white/20 lg:border-x lg:px-12">
                <a href={phoneHref} className="flex items-center gap-5">
                  <span className="grid size-14 place-items-center rounded-full border border-[#c99a42] text-[#c99a42]">
                    <Phone size={22} />
                  </span>
                  <span>
                    <span className="block font-bold">Schedule a Call</span>
                    <span className="mt-1 block text-lg font-semibold text-white/86">
                      +91 83698 93433
                    </span>
                  </span>
                </a>
                <a href={emailHref} className="flex items-center gap-5">
                  <span className="grid size-14 place-items-center rounded-full border border-[#c99a42] text-[#c99a42]">
                    <Mail size={22} />
                  </span>
                  <span>
                    <span className="block font-bold">Email Us</span>
                    <span className="mt-1 block text-lg font-semibold text-white/86">
                      {email}
                    </span>
                  </span>
                </a>
              </div>
              <div className="grid gap-5">
                <a
                  href={phoneHref}
                  className="inline-flex items-center justify-center gap-3 rounded-sm bg-[#c99a42] px-7 py-4 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#b38534]"
                >
                  Book a Consultation
                  <ArrowRight size={18} />
                </a>
                <div>
                  <p className="font-bold text-white/86">or WhatsApp us</p>
                  <a
                    href={whatsappHref}
                    className="mt-3 flex items-center gap-3 text-xl font-bold text-white"
                  >
                    <MessageCircle size={28} />
                    +91 83698 93433
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-white px-5 py-12 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 border-b border-[#e6ebe9] pb-10 md:grid-cols-[1.4fr_0.8fr_1fr_1fr]">
            <div>
              <BrandMark />
              <p className="mt-6 max-w-sm leading-7 text-[#506166]">
                Your trusted partner for tax compliance, notices, planning and
                business consulting.
              </p>
              <p className="mt-5 flex items-center gap-2 text-[#506166]">
                <MapPin size={18} className="text-[#0c6265]" />
                Based in India. Serving clients nationwide.
              </p>
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-[#102832]">
                Quick Links
              </h3>
              <div className="mt-5 grid gap-3">
                {navLinks.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="text-sm font-semibold text-[#506166] hover:text-[#0c6265]"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-[#102832]">
                Our Services
              </h3>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-[#506166]">
                <span>GST Advisory & Compliance</span>
                <span>GST Notice & Demand Handling</span>
                <span>Income Tax Compliance</span>
                <span>Income Tax Notice Handling</span>
                <span>Tax Planning</span>
                <span>Business Consulting</span>
              </div>
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-[#102832]">
                Get in Touch
              </h3>
              <div className="mt-5 grid gap-4 text-sm font-semibold text-[#506166]">
                <a href={phoneHref} className="flex items-center gap-3 hover:text-[#0c6265]">
                  <Phone size={17} />
                  +91 83698 93433
                </a>
                <a href={emailHref} className="flex items-center gap-3 hover:text-[#0c6265]">
                  <Mail size={17} />
                  {email}
                </a>
                <span className="flex items-center gap-3">
                  <MapPin size={17} />
                  India
                </span>
              </div>
            </div>
          </div>
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 pt-6 text-sm text-[#506166] md:flex-row">
            <p>© 2025 Dev Patel Consultancy. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#top" className="hover:text-[#0c6265]">
                Privacy Policy
              </a>
              <a href="#top" className="hover:text-[#0c6265]">
                Terms & Conditions
              </a>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
