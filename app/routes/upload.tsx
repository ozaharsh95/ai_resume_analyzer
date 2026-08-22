import { useState } from "react";
import { useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar";
import { prepareInstructions } from "~/constants";
import { convertPdfToImages } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { extractJSON, generateUUID, normalizeFeedback } from "~/lib/utils";
import type { Route } from "./+types/upload";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "AURA | Upload Resume" },
    {
      name: "description",
      content: "Upload your resume for an ATS score and improvement recommendations",
    },
  ];
};

interface Step {
  id: number;
  label: string;
  desc: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Cloud Sync", desc: "Uploading document to Puter Cloud FS" },
  { id: 2, label: "Page Rendering", desc: "Rasterizing PDF pages into high-res images" },
  { id: 3, label: "Thumbnail Sync", desc: "Uploading multi-page previews" },
  { id: 4, label: "AI Analysis", desc: "Evaluating ATS compatibility & skill matches" },
  { id: 5, label: "Finalizing", desc: "Persisting audit metrics to KV store" },
];

const Upload = () => {
  const { fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setErrorMessage(null);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    fileToProcess,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    fileToProcess: File;
  }) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Step 1: Upload raw PDF to Puter FS
      setCurrentStep(1);
      const uploadedFile = await fs.upload([fileToProcess]);
      if (!uploadedFile) {
        throw new Error("Failed to upload PDF to Puter storage.");
      }

      // Step 2: Convert PDF pages to high-res images
      setCurrentStep(2);
      const conversion = await convertPdfToImages(fileToProcess, 4);
      if (!conversion.pages || conversion.pages.length === 0) {
        throw new Error(conversion.error || "Could not rasterize PDF pages.");
      }

      // Step 3: Upload page thumbnails
      setCurrentStep(3);
      const imageFiles = conversion.pages.map((p) => p.file);
      const uploadedImages: string[] = [];

      for (const img of imageFiles) {
        const upImg = await fs.upload([img]);
        if (upImg?.path) {
          uploadedImages.push(upImg.path);
        }
      }

      const primaryImagePath = uploadedImages[0] || "";

      // Step 4: AI Analysis
      setCurrentStep(4);
      const instructions = prepareInstructions({
        jobTitle: jobTitle || "Target Role",
        jobDescription: jobDescription || "General Industry Best Practices",
      });

      const feedbackResponse = await ai.feedback(uploadedFile.path, instructions);
      if (!feedbackResponse) {
        throw new Error("AI feedback evaluation timed out or failed to respond.");
      }

      const rawText =
        typeof feedbackResponse.message?.content === "string"
          ? feedbackResponse.message.content
          : Array.isArray(feedbackResponse.message?.content)
          ? feedbackResponse.message.content[0]?.text || ""
          : JSON.stringify(feedbackResponse.message?.content || {});

      let parsedFeedback: Feedback;
      try {
        const rawJson = extractJSON(rawText);
        parsedFeedback = normalizeFeedback(rawJson);
      } catch (parseErr) {
        console.warn("Falling back to normalized feedback:", parseErr);
        parsedFeedback = normalizeFeedback(null);
      }

      // Step 5: Persist to Puter KV Store
      setCurrentStep(5);
      const uuid = generateUUID();
      const resumeRecord: Resume = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: primaryImagePath,
        imagePaths: uploadedImages,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        createdAt: Date.now(),
        feedback: parsedFeedback,
      };

      await kv.set(`resume:${uuid}`, JSON.stringify(resumeRecord));

      // Redirect to feedback review page
      navigate(`/resume/${uuid}`);
    } catch (err) {
      console.error("Analysis Pipeline Error:", err);
      setIsProcessing(false);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during processing.",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setErrorMessage("Please upload your resume in PDF format first.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const companyName = (formData.get("company-name") as string) || "";
    const jobTitle = (formData.get("job-title") as string) || "";
    const jobDescription = (formData.get("job-description") as string) || "";

    handleAnalyze({
      companyName,
      jobTitle,
      jobDescription,
      fileToProcess: file,
    });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="main-section max-w-4xl mx-auto">
        <div className="page-heading py-10">
          <h1>Smart feedback for your dream job</h1>
          <h2 className="text-xl text-gray-600">
            Drop your resume for an in-depth ATS breakdown, skill analysis, and targeted suggestions
          </h2>
        </div>

        {errorMessage && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-sm font-bold text-red-500 hover:text-red-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {isProcessing ? (
          <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center gap-6 animate-in fade-in duration-500">
            <div className="relative flex items-center justify-center">
              <img src="/images/resume-scan.gif" className="w-48 h-48 object-contain" alt="Processing" />
            </div>

            <div className="w-full max-w-md flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                <span>Analyzing Resume Pipeline</span>
                <span className="text-indigo-600 font-bold">{Math.round((currentStep / 5) * 100)}%</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                />
              </div>

              <div className="flex flex-col gap-2.5 mt-2">
                {STEPS.map((step) => {
                  const isDone = currentStep > step.id;
                  const isCurrent = currentStep === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                        isCurrent
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium"
                          : isDone
                          ? "text-gray-500 opacity-80"
                          : "text-gray-400 opacity-50"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                            ? "bg-indigo-600 text-white animate-pulse"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isDone ? "✓" : step.id}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{step.label}</span>
                        <span className="text-[11px] text-gray-500">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <form
            id="upload-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 mt-4 w-full bg-white/80 backdrop-blur-sm p-8 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label htmlFor="company-name" className="font-semibold text-sm text-gray-700">
                  Target Company <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="e.g. Google, Microsoft, Stripe"
                  id="company-name"
                  className="w-full p-4 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="job-title" className="font-semibold text-sm text-gray-700">
                  Target Job Title <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="e.g. Senior Frontend Engineer"
                  id="job-title"
                  className="w-full p-4 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="job-description" className="font-semibold text-sm text-gray-700">
                Job Description <span className="text-gray-400 font-normal">(Recommended for accurate match scoring)</span>
              </label>
              <textarea
                name="job-description"
                placeholder="Paste the target job description or key responsibilities here..."
                id="job-description"
                rows={5}
                className="w-full p-4 border border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 w-full">
              <label className="font-semibold text-sm text-gray-700">
                Resume Document (PDF) <span className="text-red-500">*</span>
              </label>
              <FileUploader onFileSelect={handleFileSelect} />
            </div>

            <button
              className="primary-button py-4 text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              type="submit"
            >
              Analyze Resume with AI
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default Upload;

