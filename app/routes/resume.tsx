import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/resume";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "AURA | Resume Analysis" },
    {
      name: "description",
      content: "View comprehensive AI feedback, ATS scores, and targeted resume improvements.",
    },
  ];
};

const Resume = () => {
  const { id } = useParams();
  const { auth, isLoading, fs, kv } = usePuterStore();
  const navigate = useNavigate();

  const [resumeData, setResumeData] = useState<Resume | null>(null);
  const [resumeFileUrl, setResumeFileUrl] = useState<string>("");
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const handleDeleteResume = async () => {
    if (!resumeData && !id) return;
    setIsDeleting(true);
    try {
      // 1. Gather all associated files
      const filesToDelete = new Set<string>();
      if (resumeData?.resumePath) filesToDelete.add(resumeData.resumePath);
      if (resumeData?.imagePath) filesToDelete.add(resumeData.imagePath);
      if (Array.isArray(resumeData?.imagePaths)) {
        resumeData.imagePaths.forEach((p) => {
          if (p) filesToDelete.add(p);
        });
      }

      // 2. Delete all files from Puter FS
      await Promise.allSettled(
        Array.from(filesToDelete).map((filePath) =>
          fs.delete(filePath).catch((err) => {
            console.warn(`Could not delete file ${filePath}:`, err);
          })
        )
      );

      // 3. Delete KV record
      if (id) {
        await kv.delete(`resume:${id}`);
      }

      // 4. Navigate back to dashboard
      navigate("/");
    } catch (err) {
      console.error("Failed to delete resume:", err);
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading, auth.isAuthenticated, id]);

  useEffect(() => {
    let active = true;
    const blobUrls: string[] = [];

    const loadResume = async () => {
      if (!id) return;
      setIsFetching(true);
      setNotFound(false);

      try {
        const rawJson = await kv.get(`resume:${id}`);
        if (!rawJson) {
          if (active) {
            setNotFound(true);
            setIsFetching(false);
          }
          return;
        }

        const data = JSON.parse(rawJson) as Resume;
        if (!active) return;
        setResumeData(data);

        // Load PDF Blob
        if (data.resumePath) {
          try {
            const pdfBlob = await fs.read(data.resumePath);
            if (pdfBlob && active) {
              const url = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));
              blobUrls.push(url);
              setResumeFileUrl(url);
            }
          } catch (e) {
            console.warn("Could not load PDF blob:", e);
          }
        }

        // Load page preview images
        const pathsToLoad =
          Array.isArray(data.imagePaths) && data.imagePaths.length > 0
            ? data.imagePaths
            : data.imagePath
            ? [data.imagePath]
            : [];

        const loadedUrls: string[] = [];
        for (const p of pathsToLoad) {
          try {
            const imgBlob = await fs.read(p);
            if (imgBlob && active) {
              const u = URL.createObjectURL(imgBlob);
              blobUrls.push(u);
              loadedUrls.push(u);
            }
          } catch (e) {
            console.warn("Could not load image blob:", p, e);
          }
        }

        if (active) {
          setPageImages(loadedUrls);
          setIsFetching(false);
        }
      } catch (err) {
        console.error("Error reading resume from Puter:", err);
        if (active) {
          setNotFound(true);
          setIsFetching(false);
        }
      }
    };

    loadResume();

    return () => {
      active = false;
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id]);

  if (notFound) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md flex flex-col items-center gap-4">
          <span className="text-4xl">🔍</span>
          <h2 className="text-2xl font-bold text-gray-900">Resume Report Not Found</h2>
          <p className="text-sm text-gray-500">
            This resume record might have been deleted or the link is invalid.
          </p>
          <Link to="/" className="primary-button w-fit px-6 py-2.5 text-sm font-semibold">
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="!pt-0 min-h-screen bg-[#fafbfc]">
      {/* Top Navigation */}
      <nav className="resume-nav bg-white px-6 py-3 sticky top-0 z-20 shadow-xs flex flex-row justify-between items-center">
        <Link to="/" className="back-button hover:bg-gray-50 transition-colors">
          <img src="/icons/back.svg" alt="Back" className="w-3 h-3" />
          <span className="text-gray-800 text-xs sm:text-sm font-semibold">
            Back to Dashboard
          </span>
        </Link>

        {resumeData && (
          <div className="flex items-center gap-2 max-sm:hidden">
            {resumeData.companyName && (
              <span className="bg-indigo-50 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs">
                {resumeData.companyName}
              </span>
            )}
            {resumeData.jobTitle && (
              <span className="text-xs text-gray-500 font-medium">
                {resumeData.jobTitle}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {resumeFileUrl && (
            <a
              href={resumeFileUrl}
              download={`${resumeData?.companyName || "Resume"}_analysis.pdf`}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <span>⬇</span> PDF Document
            </a>
          )}

          {showConfirmDelete ? (
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-full border border-red-200">
              <button
                onClick={handleDeleteResume}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="bg-white hover:bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              title="Delete Resume & Data"
            >
              <span>🗑</span> Delete
            </button>
          )}

          <Link
            to="/upload"
            className="primary-button text-xs font-semibold py-1.5 px-3.5 w-auto"
          >
            + Upload New
          </Link>
        </div>
      </nav>

      {/* Main Grid View */}
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        {/* Left Side: PDF Document Viewer */}
        <section className="feedback-section bg-gradient-to-br from-indigo-50/40 via-white to-gray-50 h-auto lg:h-[calc(100vh-57px)] lg:sticky lg:top-[57px] flex flex-col items-center justify-start py-6 px-6 overflow-y-auto">
          {pageImages.length > 0 ? (
            <div className="flex flex-col items-center w-full max-w-lg gap-3 animate-in fade-in duration-500">
              {/* Multi-page Controls */}
              {pageImages.length > 1 && (
                <div className="flex items-center justify-between w-full bg-white px-4 py-2 rounded-2xl shadow-xs border border-gray-100 text-xs font-medium text-gray-600">
                  <button
                    onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentPageIndex === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                  >
                    ◀ Prev Page
                  </button>
                  <span>
                    Page <b>{currentPageIndex + 1}</b> of <b>{pageImages.length}</b>
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPageIndex((prev) => Math.min(pageImages.length - 1, prev + 1))
                    }
                    disabled={currentPageIndex === pageImages.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                  >
                    Next Page ▶
                  </button>
                </div>
              )}

              {/* Main Page Preview */}
              <div className="gradient-border w-full shadow-lg bg-white rounded-2xl p-2 max-h-[75vh] flex items-center justify-center overflow-hidden">
                <a
                  href={resumeFileUrl || pageImages[currentPageIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Click to view full resolution"
                  className="w-full flex justify-center"
                >
                  <img
                    src={pageImages[currentPageIndex]}
                    className="w-full h-auto max-h-[70vh] object-contain rounded-xl shadow-xs"
                    alt={`Resume Page ${currentPageIndex + 1}`}
                  />
                </a>
              </div>

              {/* Multi-page Thumbnails Bar */}
              {pageImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {pageImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPageIndex(idx)}
                      className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        currentPageIndex === idx
                          ? "border-indigo-600 shadow-md scale-105"
                          : "border-gray-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Page ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-96 flex flex-col items-center justify-center text-gray-400 gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-xs font-medium text-gray-500">Loading document preview...</p>
            </div>
          )}
        </section>

        {/* Right Side: Feedback & Breakdown */}
        <section className="feedback-section flex-1 px-4 sm:px-8 py-6 max-w-4xl">
          <div className="flex flex-col gap-1 mb-2">
            <h1 className="text-3xl sm:text-4xl !text-black font-extrabold tracking-tight">
              Resume Review
            </h1>
            <p className="text-sm text-gray-500">
              Evaluated against industry ATS benchmarks and role-specific requirements.
            </p>
          </div>

          {resumeData?.feedback ? (
            <div className="flex flex-col gap-6 animate-in fade-in duration-500 mt-4">
              <Summary feedback={resumeData.feedback} />
              <ATS
                score={resumeData.feedback.ATS?.score || 0}
                suggestions={resumeData.feedback.ATS?.tips || []}
              />
              <Details feedback={resumeData.feedback} />
            </div>
          ) : isFetching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <img
                src="/images/resume-scan-2.gif"
                alt="Loading analysis"
                className="w-48 h-48 object-contain"
              />
              <p className="text-sm font-medium text-gray-500">Loading analysis metrics...</p>
            </div>
          ) : (
            <div className="p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
              No feedback metrics available for this document.
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;

