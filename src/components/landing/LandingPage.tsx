'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n/context';
import { ShipIcon, PlaneIcon, TruckIcon, PackageIcon, GlobeIcon, MapPinIcon, CheckCircleIcon, MenuIcon, XIcon, QuoteIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, ShieldIcon, DollarIcon, UsersIcon } from '@/components/icons';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import RateCalculator from '@/components/landing/RateCalculator';

// ─── Animated Counter Hook ───────────────────────────────
function useAnimatedCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (startOnView && !isInView) return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration, startOnView]);

  return { count, ref };
}

// ─── FAQ Item Component ──────────────────────────────────
function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-colors"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-sm sm:text-base font-medium text-white pr-4">{question}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 text-sm text-slate-400 leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Animated Stat Card ──────────────────────────────────
function StatCard({ value, suffix, label, icon, delay }: { value: number; suffix: string; label: string; icon: React.ReactNode; delay: number }) {
  const { count, ref } = useAnimatedCounter(value, 2200);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center backdrop-blur-sm hover:bg-white/8 hover:border-emerald-500/20 transition-all group"
    >
      <div className="flex justify-center text-emerald-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-xl sm:text-3xl font-bold text-white">
        {count}{suffix}
      </div>
      <div className="text-xs sm:text-sm text-slate-400 mt-1">{label}</div>
    </motion.div>
  );
}

// ─── Section Wrapper with Animation ──────────────────────
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const { setCurrentPage } = useAppStore();
  const { t } = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Nav */}
      <nav className="border-b border-white/10 backdrop-blur-md bg-black/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center"
            >
              <ShipIcon className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">ARWA LOGISTICS</h1>
              <p className="text-xs text-emerald-400 hidden sm:block">{t('landing.globalShipping')}</p>
            </div>
          </div>

          {/* Desktop Nav Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => setCurrentPage('public-tracking')} className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors">{t('landing.trackShipment')}</button>
            <button onClick={() => setCurrentPage('login')} className="px-4 py-2 text-sm text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors">{t('landing.signIn')}</button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentPage('register')}
              className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/25"
            >
              {t('landing.getStarted')}
            </motion.button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Nav Sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="bg-slate-900 border-white/10 w-72">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <ShipIcon className="w-5 h-5 text-white" />
              </div>
              ARWA LOGISTICS
            </SheetTitle>
            <SheetDescription className="text-emerald-400 text-xs">{t('landing.globalShipping')}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 mt-4">
            <button
              onClick={() => { setCurrentPage('public-tracking'); setMobileNavOpen(false); }}
              className="w-full text-left px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors"
            >
              {t('landing.trackShipment')}
            </button>
            <button
              onClick={() => { setCurrentPage('login'); setMobileNavOpen(false); }}
              className="w-full text-left px-4 py-3 text-white border border-white/20 rounded-lg hover:bg-white/10 text-sm transition-colors text-center"
            >
              {t('landing.signIn')}
            </button>
            <button
              onClick={() => { setCurrentPage('register'); setMobileNavOpen(false); }}
              className="w-full px-4 py-3 text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors text-center"
            >
              {t('landing.getStarted')}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-32 relative">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 hero-mesh-gradient pointer-events-none" />
        {/* Floating particles */}
        <div className="hero-particles">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="hero-particle"
              style={{
                left: `${8 + (i * 7.5) % 85}%`,
                top: `${15 + (i * 13) % 70}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${5 + (i % 4)}s`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
              }}
            />
          ))}
        </div>
        <div className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs sm:text-sm mb-6 sm:mb-8"
          >
            <GlobeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('landing.shippingFromChina')}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight"
          >
            {t('landing.heroTitle')}<br />
            <span className="text-emerald-400">{t('landing.heroTitleHighlight')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-10 px-2"
          >
            {t('landing.heroSub')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 20px 40px rgba(16, 185, 129, 0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentPage('register')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg shadow-emerald-500/25"
            >
              {t('landing.startShippingNow')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.12)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentPage('public-tracking')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/5 text-white border border-white/10 rounded-xl text-base sm:text-lg font-semibold transition-all"
            >
              {t('landing.trackAShipment')}
            </motion.button>
          </motion.div>
        </div>

        {/* Stats with Animated Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-12 sm:mt-20">
          <StatCard value={180} suffix="+" label={t('landing.statCountries')} icon={<GlobeIcon className="w-6 h-6 sm:w-8 sm:h-8" />} delay={0} />
          <StatCard value={50} suffix="K+" label={t('landing.statShipments')} icon={<PackageIcon className="w-6 h-6 sm:w-8 sm:h-8" />} delay={0.1} />
          <StatCard value={3} suffix="" label={t('landing.statWarehouses')} icon={<MapPinIcon className="w-6 h-6 sm:w-8 sm:h-8" />} delay={0.2} />
          <StatCard value={99} suffix=".5%" label={t('landing.statDeliveryRate')} icon={<CheckCircleIcon className="w-6 h-6 sm:w-8 sm:h-8" />} delay={0.3} />
        </div>
      </div>

      {/* Services */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12 decorative-line"
        >
          {t('landing.ourShippingServices')}
        </motion.h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { title: t('landing.airFreight'), desc: t('landing.airFreightDesc'), icon: <PlaneIcon className="w-8 h-8 sm:w-10 sm:h-10" />, color: 'from-sky-500/20 to-sky-600/20', border: 'border-sky-500/20', hoverBorder: 'hover:border-sky-500/40' },
            { title: t('landing.seaFreight'), desc: t('landing.seaFreightDesc'), icon: <ShipIcon className="w-8 h-8 sm:w-10 sm:h-10" />, color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/20', hoverBorder: 'hover:border-blue-500/40' },
            { title: t('landing.landFreight'), desc: t('landing.landFreightDesc'), icon: <TruckIcon className="w-8 h-8 sm:w-10 sm:h-10" />, color: 'from-amber-500/20 to-amber-600/20', border: 'border-amber-500/20', hoverBorder: 'hover:border-amber-500/40' },
          ].map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`bg-gradient-to-br ${service.color} border ${service.border} ${service.hoverBorder} rounded-xl p-6 sm:p-8 backdrop-blur-sm transition-colors cursor-pointer`}
            >
              <div className="text-white mb-3 sm:mb-4">{service.icon}</div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">{service.title}</h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{service.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Shipment Types */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12 decorative-line">{t('landing.shipmentTypes')}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { title: t('landing.parcel'), desc: t('landing.parcelDesc'), price: t('landing.parcelPrice') },
            { title: t('landing.lcl'), desc: t('landing.lclDesc'), price: t('landing.lclPrice') },
            { title: t('landing.fcl'), desc: t('landing.fclDesc'), price: t('landing.fclPrice') },
          ].map((type, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm hover:bg-white/8 hover:border-emerald-500/20 transition-all"
            >
              <div className="text-emerald-400 font-semibold mb-2">{type.price}</div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">{type.title}</h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">{type.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Why Choose Us */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{t('landing.whyChooseUs') || 'Why Choose ARWA'}</h2>
          <p className="text-slate-400 max-w-xl mx-auto">{t('landing.whyChooseUsDesc') || 'Reliable logistics solutions trusted by businesses worldwide'}</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {[
            { title: t('landing.featureTracking') || 'Real-time Tracking', desc: t('landing.featureTrackingDesc') || 'Track your shipments with 11-step status updates from origin to destination', icon: <ClockIcon className="w-6 h-6" />, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 hover:border-emerald-500/40' },
            { title: t('landing.featureSecure') || 'Secure Packaging', desc: t('landing.featureSecureDesc') || 'Professional packaging and handling to ensure your goods arrive safely', icon: <ShieldIcon className="w-6 h-6" />, color: 'from-sky-500/20 to-sky-600/10 border-sky-500/20 hover:border-sky-500/40' },
            { title: t('landing.featureRates') || 'Competitive Rates', desc: t('landing.featureRatesDesc') || 'Transparent pricing with no hidden fees for air, sea, and land freight', icon: <DollarIcon className="w-6 h-6" />, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40' },
            { title: t('landing.featureGlobal') || 'Global Coverage', desc: t('landing.featureGlobalDesc') || 'Shipping to 180+ countries with strategic warehouse locations worldwide', icon: <GlobeIcon className="w-6 h-6" />, color: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 hover:border-violet-500/40' },
            { title: t('landing.featureFast') || 'Fast Delivery', desc: t('landing.featureFastDesc') || 'Express air freight with priority handling for time-sensitive shipments', icon: <TruckIcon className="w-6 h-6" />, color: 'from-rose-500/20 to-rose-600/10 border-rose-500/20 hover:border-rose-500/40' },
            { title: t('landing.featureSupport') || '24/7 Support', desc: t('landing.featureSupportDesc') || 'Dedicated customer support team available around the clock for assistance', icon: <UsersIcon className="w-6 h-6" />, color: 'from-teal-500/20 to-teal-600/10 border-teal-500/20 hover:border-teal-500/40' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`bg-gradient-to-br ${feature.color} border rounded-xl p-6 backdrop-blur-sm transition-all`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Rate Calculator */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{t('landing.calculateRateTitle')}</h2>
          <p className="text-slate-400 max-w-xl mx-auto">{t('landing.calculateRateSub')}</p>
        </div>
        <RateCalculator />
      </AnimatedSection>

      {/* How It Works */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12 decorative-line">{t('landing.howItWorks')}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {[
            { step: 1, title: t('landing.step1Title'), desc: t('landing.step1Desc'), icon: <GlobeIcon className="w-7 h-7" /> },
            { step: 2, title: t('landing.step2Title'), desc: t('landing.step2Desc'), icon: <PackageIcon className="w-7 h-7" /> },
            { step: 3, title: t('landing.step3Title'), desc: t('landing.step3Desc'), icon: <CheckCircleIcon className="w-7 h-7" /> },
            { step: 4, title: t('landing.step4Title'), desc: t('landing.step4Desc'), icon: <MapPinIcon className="w-7 h-7" /> },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative text-center group"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
                <div className="text-emerald-400">{item.icon}</div>
              </div>
              {/* Connector line */}
              {i < 3 && (
                <div className="hidden sm:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-gradient-to-r from-emerald-500/30 to-transparent" />
              )}
              <div className="flex justify-center -mt-2 mb-2">
                <span className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {item.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Testimonials */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12 decorative-line">{t('landing.testimonials')}</h2>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {[
            {
              text: t('landing.testimonial1'),
              name: t('landing.testimonial1Name'),
              location: t('landing.testimonial1Location'),
              initials: 'AR',
              color: 'bg-emerald-500',
              role: 'Import Manager'
            },
            {
              text: t('landing.testimonial2'),
              name: t('landing.testimonial2Name'),
              location: t('landing.testimonial2Location'),
              initials: 'SC',
              color: 'bg-sky-500',
              role: 'E-commerce Owner'
            },
            {
              text: t('landing.testimonial3'),
              name: t('landing.testimonial3Name'),
              location: t('landing.testimonial3Location'),
              initials: 'MF',
              color: 'bg-amber-500',
              role: 'Business Executive'
            },
            {
              text: t('landing.testimonial4'),
              name: t('landing.testimonial4Name'),
              location: t('landing.testimonial4Location'),
              initials: 'FH',
              color: 'bg-violet-500',
              role: t('landing.testimonial4Role')
            },
          ].map((tItem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 backdrop-blur-sm hover:border-emerald-500/20 transition-all"
            >
              <QuoteIcon className="w-8 h-8 text-emerald-500/40 mb-4" />
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">&ldquo;{tItem.text}&rdquo;</p>
              <div className="border-t border-white/10 pt-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${tItem.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                  {tItem.initials}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{tItem.name}</p>
                  <p className="text-xs text-slate-400">{tItem.role} &middot; {tItem.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* Partners & Trust Section */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{t('landing.partnersTitle')}</h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">{t('landing.partnersDesc')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { name: 'GlobalTrade', abbr: 'GT' },
            { name: 'ShipFast', abbr: 'SF' },
            { name: 'CargoNet', abbr: 'CN' },
            { name: 'ExpressLink', abbr: 'EL' },
            { name: 'OceanWays', abbr: 'OW' },
            { name: 'SkyRoute', abbr: 'SR' },
          ].map((partner, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/8 hover:border-emerald-500/20 transition-all group"
            >
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-lg group-hover:bg-emerald-500/20 transition-colors">
                {partner.abbr}
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{partner.name}</span>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* FAQ */}
      <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12 decorative-line">{t('landing.faq')}</h2>
        <div className="space-y-3">
          <FAQItem
            index={0}
            question={t('landing.faq1')}
            answer={t('landing.faq1Answer')}
          />
          <FAQItem
            index={1}
            question={t('landing.faq2')}
            answer={t('landing.faq2Answer')}
          />
          <FAQItem
            index={2}
            question={t('landing.faq3')}
            answer={t('landing.faq3Answer')}
          />
          <FAQItem
            index={3}
            question={t('landing.faq4')}
            answer={t('landing.faq4Answer')}
          />
          <FAQItem
            index={4}
            question={t('landing.faq5')}
            answer={t('landing.faq5Answer')}
          />
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-8 sm:p-12 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
                animate={{ y: [-10, 10, -10], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              />
            ))}
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 relative z-10"
          >
            {t('landing.ctaTitle')}
          </motion.h2>
          <p className="text-emerald-100 max-w-xl mx-auto mb-8 relative z-10 text-sm sm:text-base">{t('landing.ctaDesc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-10">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentPage('register')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-emerald-700 rounded-xl font-semibold hover:bg-emerald-50 transition-colors text-base"
            >
              {t('landing.getStartedFree')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentPage('public-tracking')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white/10 text-white border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-colors text-base"
            >
              {t('landing.trackAShipment')}
            </motion.button>
          </div>
        </motion.div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <ShipIcon className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white text-sm">ARWA LOGISTICS</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t('landing.footerDesc')}</p>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">{t('landing.footerServices')}</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.airFreight')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.seaFreight')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.landFreight')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerCustomsClearance')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">{t('landing.footerCompany')}</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerAboutUs')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerOurWarehouses')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerCoverage')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerContact')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-3">{t('landing.footerSupport')}</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerHelpCenter')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerTrackShipment')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerShippingGuide')}</li>
                <li className="hover:text-slate-300 cursor-pointer transition-colors">{t('landing.footerApiDocs')}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-slate-500 text-xs sm:text-sm">
            ARWA LOGISTICS - {t('landing.footerBottom')}
          </div>
        </div>
      </footer>
    </div>
  );
}
