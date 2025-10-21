"use client";

import React from "react";
import {
  UploadCloud,
  Search,
  Zap,
  LayoutGrid,
  Quote,
  Users,
  GitBranch,
  FileText,
  MessageSquareText,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Navbar from "@/components/other/Navbar";
import Footer from "@/components/other/Footer";
import Link from "next/link";

// --- Section Utilities ---
const SectionContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`py-16 sm:py-24 ${className}`}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
  </section>
);

const SectionTitle = ({
  title,
  subtitle,
  center = false,
}: {
  title: string;
  subtitle: string;
  center?: boolean;
}) => (
  <div className={`mb-12 sm:mb-16 ${center ? "text-center" : "text-left"}`}>
    <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">
      {subtitle}
    </h2>
    <p className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900">
      {title}
    </p>
  </div>
);

// --- Hero Component ---
const Hero = () => (
  <SectionContainer className="pt-20 pb-16 sm:pt-32 sm:pb-24">
    <div className="text-center">
      <div className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 mb-4 sm:mb-6">
        Unlocking knowledge with AI, instantly.
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
        Instantly Query Your <br className="hidden sm:inline" />
        <span className="text-indigo-600">Knowledge Hub.</span>
      </h1>
      <p className="mt-4 sm:mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
        QueryNest is the AI-powered knowledge hub that lets you upload or sync
        documents (PDFs, DOCX, text) and receive concise, contextual answers
        instantly.
      </p>
      <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
        <Link href="/signup"><Button variant="default" size="lg">
          Start for Free <ArrowRight className="w-5 h-5 ml-2" />
        </Button></Link>
      </div>
    </div>
  </SectionContainer>
);

// --- Features Component ---
interface FeatureItem {
  name: string;
  description: string;
  icon: React.ElementType;
}

const featureList: FeatureItem[] = [
  {
    name: "Upload & Sync Documents",
    description:
      "Seamlessly connect your knowledge base by uploading PDFs, DOCX files, or syncing folders instantly.",
    icon: UploadCloud,
  },
  {
    name: "Natural Language Querying",
    description:
      "Stop digging through files. Ask questions in plain English and let QueryNest find the exact answer.",
    icon: Search,
  },
  {
    name: "Contextual, Concise Answers",
    description:
      "Receive short, accurate responses derived directly from your document content, not vague web searches.",
    icon: MessageSquareText,
  },
  {
    name: "Hybrid Elastic Search",
    description:
      "Answers are backed by advanced search technology, providing near-perfect accuracy.",
    icon: Zap,
  },
  {
    name: "Cross-Document Insights",
    description:
      "Gain macro-level insights across all uploaded documents, identifying trends and relationships instantly.",
    icon: BarChart3,
  },
  {
    name: "Uniform Document Indexing",
    description:
      "QueryNest handles disparate file formats, standardizing them into a single, queryable data layer.",
    icon: FileText,
  },
];

const Features = () => (
  <SectionContainer className="bg-gray-50">
    <SectionTitle
      title="The Core Capabilities of QueryNest"
      subtitle="Features"
      center
    />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
      {featureList.map((feature) => (
        <div
          key={feature.name}
          className="flex flex-col p-6 sm:p-8 bg-white rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border border-gray-100"
        >
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 mb-4 sm:mb-6">
            <feature.icon className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
            {feature.name}
          </h3>
          <p className="text-gray-600 text-sm sm:text-base">{feature.description}</p>
        </div>
      ))}
    </div>
  </SectionContainer>
);

// --- Testimonials Component ---
interface TestimonialItem {
  quote: string;
  name: string;
  title: string;
}

const testimonials: TestimonialItem[] = [
  {
    quote:
      "QueryNest cut our document research time by 80%. Finding project specs used to take hours; now it's instant. Its an absolute game-changer.",
    name: "Jane Doe",
    title: "Head of R&D at TechCorp",
  },
  {
    quote:
      "The cross-document insights are invaluable. We quickly found overlooked dependencies between our legacy systems documentation and current deployment plans.",
    name: "Alex Lee",
    title: "CTO of DataStream",
  },
  {
    quote:
      "Finally, a solution that truly understands the content of our PDFs. No more CTRL+F frustration. Highly recommended for any large organization.",
    name: "Marcus Chen",
    title: "VP of Operations, Global Inc.",
  },
];

const Testimonials = () => (
  <SectionContainer className="bg-indigo-100">
    <SectionTitle
      title="Trusted by Leaders in Knowledge Management"
      subtitle="What Our Users Say"
      center
    />
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {testimonials.map((testimonial, index) => (
        <div
          key={index}
          className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg relative flex flex-col justify-between h-full border-t-4 border-indigo-400"
        >
          <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500 absolute top-4 left-4 opacity-30" />
          <p className="relative text-gray-700 italic text-base sm:text-lg mb-6 sm:mb-8 mt-4">
            "{testimonial.quote}"
          </p>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-base sm:text-xl">
              {testimonial.name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{testimonial.name}</p>
              <p className="text-xs sm:text-sm text-gray-500">{testimonial.title}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </SectionContainer>
);

// --- CTA Component ---
const CTA = () => (
  <SectionContainer className="">
    <div className="bg-indigo-600 text-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-2xl text-center">
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
        Ready to Stop Searching, Start Knowing?
      </h2>
      <p className="mt-4 text-base sm:text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto">
        Join the QueryNest revolution today and transform your documents into actionable, instant knowledge.
      </p>
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
        <Link href="/signup"><Button
          variant="default"
          size="lg"
          className="bg-white text-indigo-700 hover:bg-indigo-50 focus:ring-white/50 shadow-none"
        >
          Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
        </Button></Link>
      </div>
    </div>
  </SectionContainer>
);

// --- Main Page Component ---
const Home = () => (
  <main className="min-h-screen bg-gray-50">
    <Navbar />
    <Hero />
    <Features />
    <Testimonials />
    <CTA />
    <Footer />
  </main>
);

export default Home;
