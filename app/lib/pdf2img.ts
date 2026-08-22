export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

export interface MultiPagePdfConversionResult {
  pages: Array<{
    pageNumber: number;
    imageUrl: string;
    file: File;
  }>;
  totalPages: number;
  error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;
  // Dynamically import both pdf.js core and worker from the same version
  loadPromise = Promise.all([
    import("pdfjs-dist/build/pdf.mjs"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"), // 👈 get matching worker URL
  ]).then(([lib, workerSrc]) => {
    lib.GlobalWorkerOptions.workerSrc = workerSrc.default;
    pdfjsLib = lib;
    return lib;
  });
  return loadPromise;
}

export async function convertPdfToImages(
  file: File,
  maxPages: number = 5,
): Promise<MultiPagePdfConversionResult> {
  try {
    const lib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const pagesToConvert = Math.min(totalPages, maxPages);

    const pages: Array<{
      pageNumber: number;
      imageUrl: string;
      file: File;
    }> = [];

    const baseName = file.name.replace(/\.pdf$/i, "");

    for (let pageNum = 1; pageNum <= pagesToConvert; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 3.5 }); // High resolution for crisp UI & OCR
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
      }

      await page.render({ canvasContext: context!, viewport }).promise;

      const pageBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });

      if (pageBlob) {
        const pageFile = new File(
          [pageBlob],
          `${baseName}_page_${pageNum}.jpg`,
          { type: "image/jpeg" },
        );
        pages.push({
          pageNumber: pageNum,
          imageUrl: URL.createObjectURL(pageBlob),
          file: pageFile,
        });
      }
    }

    return {
      pages,
      totalPages,
    };
  } catch (err) {
    console.error("Failed to convert PDF multi-page:", err);
    return {
      pages: [],
      totalPages: 0,
      error: `Failed to convert PDF: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function convertPdfToImage(
  file: File,
): Promise<PdfConversionResult> {
  const result = await convertPdfToImages(file, 1);
  if (result.pages && result.pages.length > 0) {
    return {
      imageUrl: result.pages[0].imageUrl,
      file: result.pages[0].file,
    };
  }
  return {
    imageUrl: "",
    file: null,
    error: result.error || "Failed to render PDF page",
  };
}

