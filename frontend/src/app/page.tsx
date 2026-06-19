import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0915] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Glow ambient backgrounds */}
      <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] max-w-[700px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[60vw] h-[60vw] max-w-[700px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-3xl text-center z-10 space-y-8 px-4">
        {/* Brand Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/[0.08] rounded-full text-xs font-semibold text-purple-300 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          Version 1.0 Release
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Your AI-Powered <br />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">CareerCopilot</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
            Optimize your resume, benchmark against job descriptions, analyze ATS compatibility, bridge skill gaps, and prepare for interviews.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 max-w-2xl mx-auto text-left">
          {[
            { title: "ATS Checker", desc: "Scan formatting & keywords" },
            { title: "Skill Gap Audit", desc: "Custom learning roadmap" },
            { title: "Smart Tailoring", desc: "Wording recommendations" },
            { title: "Cover Letters", desc: "Custom tailored generation" },
            { title: "Interview Prep", desc: "5 tailored prep questions" },
            { title: "Job Matching", desc: "Sentence semantic analysis" },
          ].map((feat, idx) => (
            <div key={idx} className="p-4 bg-white/[0.01] border border-white/[0.05] rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-1">{feat.title}</h3>
              <p className="text-zinc-500 text-xs">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto py-3.5 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all focus:outline-none shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] active:scale-[0.98] text-center"
          >
            Launch Copilot
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3.5 px-8 bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 font-semibold rounded-xl text-sm transition-all text-center"
          >
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
