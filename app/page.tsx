'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import Script from 'next/script';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Users, MessageSquare, Award, TrendingUp } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const { t } = useLanguage();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SmartPath",
    "url": "https://smartpath.id.vn",
    "description": "Nền tảng học tập thông minh cho sinh viên đại học",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://smartpath.id.vn/forum?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  useEffect(() => {
    if (!loading && profile) {
      router.push('/forum');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: MessageSquare,
      title: t.landing.features.forum,
      description: t.landing.features.forumDesc,
    },
    {
      icon: BookOpen,
      title: t.landing.features.materials,
      description: t.landing.features.materialsDesc,
    },
    {
      icon: Users,
      title: t.landing.features.chatbot,
      description: t.landing.features.chatbotDesc,
    },
    {
      icon: Award,
      title: t.landing.features.rewards,
      description: t.landing.features.rewardsDesc,
    },
    {
      icon: TrendingUp,
      title: t.landing.features.recommendation,
      description: t.landing.features.recommendationDesc,
    },
    {
      icon: MessageSquare,
      title: t.landing.features.chat,
      description: t.landing.features.chatDesc,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container mx-auto px-4 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center p-4 bg-blue-500 rounded-2xl mb-6"
          >
            <GraduationCap className="h-12 w-12 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600"
          >
            {t.landing.welcomeTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            {t.landing.welcomeDesc}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex gap-4 justify-center"
          >
            <Link href="/forum">
              <Button size="lg" className="text-lg px-8">
                {t.landing.start}
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                {t.common.signUp}
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
            >
              <Card className="hover:shadow-lg transition-shadow hover:scale-105 transform duration-300">
                <CardContent className="p-6">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mt-20 text-center"
        >
          <Card className="max-w-3xl mx-auto bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 hover:shadow-2xl transition-shadow">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-4">{t.landing.readyToJoin}</h2>
              <p className="text-lg text-blue-50 mb-8">
                {t.landing.joinDesc}
              </p>
              <Link href="/auth/register">
                <Button size="lg" variant="secondary" className="text-lg px-8 hover:scale-105 transform transition-transform">
                  {t.common.createAccount}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
