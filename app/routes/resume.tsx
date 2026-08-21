import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/resume";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "AURA | Resume" },
    {
      name: "description",
      content: "View your resume feedback and suggestions",
    },
  ];
};

const Resume = () => {
  const { id } = useParams();
  const { auth, isLoading, fs, kv } = usePuterStore();

  const [resumeFileUrl, setResumeFileUrl] = useState<string>("");
  const [imageFileUrl, setImageFileUrl] = useState<string>("");
  const [resumeFeedback, setResumeFeedback] = useState<Feedback | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading]);

  useEffect(() => {
    const loadResume = async () => {
      const resume = await kv.get(`resume:${id}`);

      if (!resume) {
        return;
      }

      const data = JSON.parse(resume);

      const resumeBlob = await fs.read(data.resumePath);

      if (!resumeBlob) {
        return;
      }

      const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
      const resumeFileUrl = URL.createObjectURL(pdfBlob);
      setResumeFileUrl(resumeFileUrl);

      const imageBlob = await fs.read(data.imagePath);

      if (!imageBlob) return;

      const imageFileUrl = URL.createObjectURL(
        new Blob([imageBlob], { type: "image/jpeg" }),
      );
      setImageFileUrl(imageFileUrl);

      setResumeFeedback(data.feedback);
    };
    loadResume();
  }, [id]);

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageFileUrl && resumeFileUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeFileUrl} rel="nooperner noreferrer">
                <img
                  src={imageFileUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                />
              </a>
            </div>
          )}
        </section>

        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
          {resumeFeedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={resumeFeedback} />
              <ATS
                score={resumeFeedback.ATS.score || 0}
                suggestions={resumeFeedback.ATS.tips || []}
              />
              <Details feedback={resumeFeedback} />
            </div>
          ) : (
            <img
              src="/images/resume-scan-2.gif"
              alt="loading"
              className="w-full"
            />
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;
