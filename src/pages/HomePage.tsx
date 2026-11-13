import React from 'react';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Languages,
  Mic,
  PenTool,
  Sparkles,
} from 'lucide-react';
import heroIllustration from '../assets/images/hero_student_illustration_1794580996145.jpg';
import imgBeginner from '../assets/images/course_beginner_english_1794580995577.jpg';
import imgEveryday from '../assets/images/course_everyday_english_1794580996532.jpg';
import imgGrammar from '../assets/images/course_essential_grammar_1794580996805.jpg';
import imgSpoken from '../assets/images/course_spoken_english_1794580997046.jpg';
import { useApp } from '../context/AppContext';

export function HomePage() {
  const { enterWorkspace, t } = useApp();

  const featureHighlights = [
    {
      title: t('cardWordMeaningTitle'),
      desc: t('cardWordMeaningDesc'),
      icon: BookOpen,
      accent: 'var(--lb-primary)',
    },
    {
      title: t('cardTranslatorTitle'),
      desc: t('cardTranslatorDesc'),
      icon: Languages,
      accent: 'var(--lb-accent-2)',
    },
    {
      title: t('cardSpeakingTitle'),
      desc: t('cardSpeakingDesc'),
      icon: Mic,
      accent: 'var(--lb-accent-3)',
    },
    {
      title: t('cardSentenceTitle'),
      desc: t('cardSentenceDesc'),
      icon: PenTool,
      accent: 'var(--lb-accent-4)',
    },
  ];

  // Informational image cards on the lower Homepage — intentionally non-navigational & without Start buttons
  const visualShowcases = [
    {
      title: t('course1Title'),
      desc: t('course1Desc'),
      meta: 'Beginner → Advanced · 15 Core Modules',
      image: imgBeginner,
    },
    {
      title: t('course2Title'),
      desc: t('course2Desc'),
      meta: 'Live Microphone & Word-Meaning Coach',
      image: imgEveryday,
    },
    {
      title: t('course3Title'),
      desc: t('course3Desc'),
      meta: 'Sentence Construction & Grammar Analysis',
      image: imgGrammar,
    },
    {
      title: t('course4Title'),
      desc: t('course4Desc'),
      meta: '10 Pure Bengali Grammar & Spelling Guides',
      image: imgSpoken,
    },
  ];

  return (
    <div className="relative z-10">
      {/* Top Hero Section with the ONLY "Get Started" entry CTA */}
      <section className="lb-hero-gradient border-b lb-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold"
                style={{ color: 'var(--lb-primary)' }}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{t('heroBadge')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight lb-text leading-[1.12] text-balance">
                {t('heroTitleStart')}{' '}
                <span style={{ color: 'var(--lb-primary)' }}>{t('heroTitleBlue')}</span>
                <br />
                {t('heroTitleEnd')}
              </h1>

              <p className="text-base sm:text-lg lb-muted font-bengali leading-relaxed max-w-xl">
                {t('heroSubtitle')}
              </p>

              {/* Top Get Started Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => enterWorkspace('word-meaning')}
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base shadow-md transition-all cursor-pointer lb-btn-primary"
                >
                  <span>{t('getStarted')}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm lb-muted pt-1">
                <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--lb-accent-2)' }} />
                <span>{t('heroMicroNote')}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border lb-border lb-surface shadow-lg">
                <img
                  src={heroIllustration}
                  alt="LingoBangla educational platform illustration"
                  className="w-full h-auto object-cover aspect-[4/3]"
                  referrerPolicy="no-referrer"
                />
                <div
                  className="hidden sm:block absolute top-5 left-5 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-md"
                  style={{ backgroundColor: 'var(--lb-primary)', color: 'var(--lb-primary-text)' }}
                >
                  Hello!
                </div>
                <div className="hidden sm:block absolute top-6 right-5 px-3.5 py-1.5 rounded-xl lb-surface lb-text border lb-border text-sm font-bold font-bengali shadow-md">
                  ধন্যবাদ!
                </div>
                <div
                  className="hidden sm:block absolute bottom-5 right-6 px-3.5 py-1.5 rounded-xl text-white text-sm font-bold font-bengali shadow-md"
                  style={{ backgroundColor: 'var(--lb-accent-2)' }}
                >
                  স্বাগতম!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Informational Platform Capabilities (Read-only overview; no direct topic entry from lower cards) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold lb-text tracking-tight">
            {t('showcaseHeading')}
          </h2>
          <p className="text-sm sm:text-base lb-muted font-bengali mt-2">
            {t('showcaseSubheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featureHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="lb-surface border lb-border rounded-2xl p-6 shadow-xs flex flex-col gap-3"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: 'var(--lb-surface-alt)',
                    color: item.accent,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold lb-text font-bengali">{item.title}</h3>
                <p className="text-sm lb-muted font-bengali leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lower Visual Informational Cards — Images + Info Only (Zero Start Buttons, No Topic Entry) */}
      <section className="lb-surface-alt border-y lb-border py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-extrabold lb-text">{t('featurePreviewHeading')}</h2>
            <p className="text-sm sm:text-base lb-muted font-bengali mt-1.5">
              {t('featurePreviewSubheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visualShowcases.map((card) => (
              <article
                key={card.title}
                className="lb-surface border lb-border rounded-2xl overflow-hidden shadow-xs flex flex-col"
              >
                <div className="aspect-[4/3] overflow-hidden lb-surface-alt">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-5 space-y-2 flex-1">
                  <div className="text-xs font-semibold" style={{ color: 'var(--lb-primary)' }}>
                    {card.meta}
                  </div>
                  <h3 className="text-base font-bold lb-text font-bengali">{card.title}</h3>
                  <p className="text-sm lb-muted font-bengali leading-relaxed">{card.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Informational Summary Bar (points back to top Get Started flow) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="lb-surface border lb-border rounded-2xl p-6 sm:p-8 text-center space-y-2">
          <h2 className="text-xl font-bold lb-text font-bengali">{t('ctaBannerTitle')}</h2>
          <p className="text-sm lb-muted font-bengali">{t('ctaBannerSub')}</p>
        </div>
      </section>
    </div>
  );
}
