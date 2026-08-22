import type { Route } from "./+types/home";
import { usePuterStore } from "~/lib/puter";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AURA | Dashboard" },
    {
      name: "description",
      content:
        "Track your analyzed resumes, ATS scores, and improvement recommendations.",
    },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate("/auth?next=/");
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);
      try {
        const rawItems = (await kv.list("resume:*", true)) as KVItem[];
        if (Array.isArray(rawItems)) {
          const parsed = rawItems
            .map((item) => {
              try {
                return JSON.parse(item.value) as Resume;
              } catch {
                return null;
              }
            })
            .filter((r): r is Resume => r !== null)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          setResumes(parsed);
        }
      } catch (err) {
        console.error("Failed to load resumes from Puter KV:", err);
      } finally {
        setLoadingResumes(false);
      }
    };

    loadResumes();
  }, []);

  const handleDeleteResume = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredResumes = resumes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.companyName?.toLowerCase().includes(q) ||
      r.jobTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="main-section max-w-7xl mx-auto px-4">
        <div className="page-heading py-12">
          <h1>Track your applications & resume ratings</h1>

          {!loadingResumes && resumes.length === 0 ? (
            <h2 className="text-xl text-gray-500 max-w-xl">
              No resumes analyzed yet. Upload your first resume to get instant
              AI-powered ATS scores and personalized recommendations.
            </h2>
          ) : (
            <h2 className="text-xl text-gray-500">
              Review your submissions, track ATS compatibility, and refine your
              applications
            </h2>
          )}
        </div>

        {/* Dashboard Top Bar with Search & Action */}
        {!loadingResumes && resumes.length > 0 && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by company or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-sm shadow-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <Link
              to="/upload"
              className="primary-button py-2.5 px-6 text-sm font-semibold flex items-center gap-2 shrink-0 shadow-sm hover:shadow transition-all w-auto"
            >
              <span>+</span> Upload New Resume
            </Link>
          </div>
        )}

        {loadingResumes && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <img
              src="/images/resume-scan-2.gif"
              className="w-48 h-48 object-contain"
              alt="Loading resumes"
            />
            <p className="text-sm font-medium text-gray-500">
              Loading your cloud resumes...
            </p>
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <>
            {filteredResumes.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <p>No resumes match &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <div className="resumes-section">
                {filteredResumes.map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onDelete={handleDeleteResume}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!loadingResumes && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-4 gap-6 bg-white/70 backdrop-blur-sm p-12 rounded-3xl border border-gray-100 shadow-sm max-w-lg mx-auto text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
              📄
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-gray-900">
                Start Your First Review
              </h3>
              <p className="text-sm text-gray-500">
                Get categorized scores across ATS, Content, Structure, Skills,
                and Tone.
              </p>
            </div>
            <Link
              to="/upload"
              className="primary-button w-fit text-base font-semibold px-8 py-3 shadow-md hover:shadow-lg transition-all"
            >
              Upload Resume (PDF)
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
