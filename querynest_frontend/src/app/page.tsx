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
        MindMesh is the AI-powered knowledge hub that lets you upload or sync
        documents (PDFs, DOCX, text) and receive concise, contextual answers
        instantly.
      </p>
      <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
        <Button variant="default" size="lg">
          Start for Free <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button variant="outline" size="lg">
          View Demo
        </Button>
      </div>
    </div>

    {/* Mock Interface Preview */}
    <div className="mt-12 sm:mt-16 hidden md:block">
      <div className="relative overflow-hidden rounded-2xl bg-gray-900 shadow-2xl ring-1 ring-gray-900/10 p-4 sm:p-8">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900/50 to-gray-900 opacity-80" />
        <div className="relative z-10 p-6 sm:p-12 border-4 border-indigo-500/30 rounded-xl">
          <div className="h-96 bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 flex flex-col">
            <div className="bg-gray-800 p-3 rounded-t-xl flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
            </div>
            <div className="flex-grow flex p-6">
              <div className="w-1/4 pr-6 border-r border-gray-700 hidden lg:block">
                <h4 className="text-sm font-semibold text-indigo-400 mb-4">
                  DOCUMENTS
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-white/80">Q4 Strategy Deck.pdf</li>
                  <li className="text-white/80">Project Phoenix.docx</li>
                  <li className="text-indigo-400 font-medium bg-gray-800 p-2 rounded-lg">
                    Product Roadmap.txt
                  </li>
                </ul>
              </div>
              <div className="w-full lg:w-3/4 pl-0 lg:pl-6 space-y-4">
                <div className="p-4 bg-indigo-600 rounded-xl rounded-bl-none text-white shadow-lg self-start max-w-full sm:max-w-xl ml-auto">
                  What is the projected Q3 budget for the marketing team based
                  on 'Project Phoenix'?
                </div>
                <div className="p-4 bg-gray-700 rounded-xl rounded-tl-none text-gray-200 shadow-lg self-start max-w-full sm:max-w-xl mr-auto">
                  <p className="font-semibold text-indigo-300 mb-2">
                    MindMesh AI Answer:
                  </p>
                  <p>
                    The projected Q3 budget for the marketing team is{" "}
                    <strong>$150,000</strong>, allocated primarily to digital
                    ad spend and content creation, as detailed in section 3.2
                    of the 'Project Phoenix' document.
                  </p>
                  <p className="mt-3 text-xs text-gray-400">
                    Source: Project Phoenix.docx (Hybrid Elastic Search)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      "Stop digging through files. Ask questions in plain English and let MindMesh find the exact answer.",
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
      "Answers are backed by advanced search technology, providing pinpoint accuracy and reliable source citations.",
    icon: Zap,
  },
  {
    name: "Cross-Document Insight Mode",
    description:
      "Gain macro-level insights across all uploaded documents, identifying trends and relationships instantly.",
    icon: BarChart3,
  },
  {
    name: "Uniform Document Indexing",
    description:
      "MindMesh handles disparate file formats, standardizing them into a single, queryable data layer.",
    icon: FileText,
  },
];

const Features = () => (
  <SectionContainer className="bg-gray-50">
    <SectionTitle
      title="The Core Capabilities of MindMesh"
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

// --- Integrations Component ---
const Integrations = () => (
  <SectionContainer className="bg-white">
    <SectionTitle
      title="Connect Your Existing Knowledge Base"
      subtitle="Seamless Integrations"
      center
    />
    <p className="text-center text-base sm:text-lg text-gray-600 max-w-xl mx-auto mb-12 sm:mb-16">
      MindMesh connects directly to the tools you already use, keeping your knowledge hub always up-to-date and instantly queryable.
    </p>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-8">
      {[
        { name: "Google Drive", icon: GitBranch },
        { name: "Microsoft OneDrive", icon: Users },
        { name: "Slack", icon: MessageSquareText },
        { name: "Notion", icon: LayoutGrid },
        { name: "SharePoint", icon: Zap },
        { name: "Dropbox", icon: UploadCloud },
      ].map((integration) => (
        <div
          key={integration.name}
          className="flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 rounded-xl transition-transform duration-300 hover:scale-[1.05] hover:shadow-md border border-gray-200"
        >
          <integration.icon className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-600 mb-2 sm:mb-3" />
          <span className="text-sm sm:text-base font-medium text-gray-700">
            {integration.name}
          </span>
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
      "MindMesh cut our document research time by 80%. Finding project specs used to take hours; now it's instant. The citation feature is a game-changer.",
    name: "Jane Doe",
    title: "Head of R&D at TechCorp",
  },
  {
    quote:
      "The Insight Mode is invaluable. We quickly found overlooked dependencies between our legacy systems documentation and current deployment plans.",
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
        Join the MindMesh revolution today and transform your documents into actionable, instant knowledge.
      </p>
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-x-6">
        <Button
          variant="default"
          size="lg"
          className="bg-white text-indigo-700 hover:bg-indigo-50 focus:ring-white/50 shadow-none"
        >
          Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="text-white border-white bg-transparent hover:bg-indigo-700/50 focus:ring-white/50 shadow-none"
        >
          Contact Sales
        </Button>
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
    <Integrations />
    <Testimonials />
    <CTA />
    <Footer />
  </main>
);

export default Home;
