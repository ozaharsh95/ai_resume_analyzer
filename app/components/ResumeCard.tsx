import { Link } from "react-router";
import ScoreCircle from "./ScoreCircle";
import { useState, useEffect } from "react";
import { usePuterStore } from "~/lib/puter";

interface ResumeCardProps {
  resume: Resume;
  onDelete?: (id: string) => void;
}

const ResumeCard = ({ resume, onDelete }: ResumeCardProps) => {
  const { fs, kv } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl = "";

    const loadResume = async () => {
      if (!resume?.imagePath) return;
      try {
        const blob = await fs.read(resume.imagePath);
        if (!blob || !active) return;
        createdUrl = URL.createObjectURL(blob);
        setResumeUrl(createdUrl);
      } catch (err) {
        console.warn("Could not load preview image for resume:", resume.id, err);
      }
    };

    loadResume();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [resume?.imagePath, resume?.id]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Gather all associated file paths (PDF + all page thumbnails)
      const filesToDelete = new Set<string>();
      if (resume?.resumePath) filesToDelete.add(resume.resumePath);
      if (resume?.imagePath) filesToDelete.add(resume.imagePath);
      if (Array.isArray(resume?.imagePaths)) {
        resume.imagePaths.forEach((path) => {
          if (path) filesToDelete.add(path);
        });
      }

      // 2. Delete all files from Puter FS concurrently
      await Promise.allSettled(
        Array.from(filesToDelete).map((filePath) =>
          fs.delete(filePath).catch((err) => {
            console.warn(`Could not delete file ${filePath}:`, err);
          })
        )
      );

      // 3. Delete KV record from Puter KV Store
      if (resume?.id) {
        await kv.delete(`resume:${resume.id}`);
      }

      // 4. Revoke blob URL if active
      if (resumeUrl) {
        URL.revokeObjectURL(resumeUrl);
      }

      // 5. Trigger UI update in parent
      onDelete?.(resume.id);
    } catch (err) {
      console.error("Failed to delete resume and related data:", err);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const formattedDate = resume.createdAt
    ? new Date(resume.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="relative group">
      <Link
        to={`/resume/${resume.id}`}
        className="resume-card animate-in fade-in duration-500 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-indigo-100 relative block"
      >
        <div className="resume-card-header">
          <div className="flex flex-col gap-1 pr-2">
            {resume?.companyName ? (
              <h2 className="!text-black font-bold text-xl tracking-tight line-clamp-1">
                {resume.companyName}
              </h2>
            ) : null}

            {resume?.jobTitle ? (
              <h3 className="text-sm font-medium text-gray-500 line-clamp-1">
                {resume.jobTitle}
              </h3>
            ) : (
              <h3 className="text-sm font-medium text-gray-400">General Evaluation</h3>
            )}

            {formattedDate && (
              <span className="text-[11px] text-gray-400 font-mono mt-0.5">
                {formattedDate}
              </span>
            )}
          </div>

          <div className="shrink-0">
            <ScoreCircle score={resume?.feedback?.overallScore ?? 0} />
          </div>
        </div>

        <div className="gradient-border animate-in fade-in duration-500 overflow-hidden flex items-center justify-center bg-gray-50/50">
          {resumeUrl ? (
            <img
              src={resumeUrl}
              alt={resume.companyName || "Resume Preview"}
              className="w-full h-[340px] max-sm:h-[200px] object-cover object-top rounded-xl"
            />
          ) : (
            <div className="w-full h-[340px] max-sm:h-[200px] flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50 rounded-xl">
              <span className="text-3xl">📄</span>
              <span className="text-xs">Document stored in Puter</span>
            </div>
          )}
        </div>
      </Link>

      {/* Delete button positioned on top corner */}
      <div className="absolute top-3 right-3 z-10">
        {showConfirm ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-red-200 animate-in zoom-in-95 duration-200"
          >
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer"
            >
              {isDeleting ? "..." : "Delete"}
            </button>
            <button
              onClick={handleCancelDelete}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            title="Delete Resume"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 p-2 rounded-full shadow-md border border-gray-200 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ResumeCard;

