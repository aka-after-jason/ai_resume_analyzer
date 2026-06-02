import { version } from "pdfjs-dist/package.json";

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

/**
 * 动态加载 PDF.js 库并配置可靠的 CDN Worker
 */
async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;

    // @ts-expect-error - pdfjs-dist/build/pdf.mjs Type definition workaround
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        // 使用与当前 node_modules 中完全一致的版本号，通过 unpkg 镜像加载 worker
        // 这样可以彻底避免 React Router 的 "No route matches" 本地路由拦截报错
        lib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
        pdfjsLib = lib;
        isLoading = false;
        return lib;
    }).catch((err) => {
        isLoading = false;
        loadPromise = null;
        throw new Error(`Failed to load PDF.js library: ${err.message}`);
    });

    return loadPromise;
}

/**
 * 将 PDF 的第一页转换为 PNG 图片文件
 * @param file 用户的 PDF File 对象
 */
export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        // 1. 初始化加载 PDFJS
        const lib = await loadPdfJs();

        // 2. 读取文件并加载文档
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

        // 3. 获取第一页
        const page = await pdf.getPage(1);

        // 4. 设置缩放比例（4倍可以保证生成的图片非常清晰，适合简历分析）
        const viewport = page.getViewport({ scale: 4 });

        // 5. 创建并配置 Canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("无法初始化 Canvas 2D 上下文。");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // 提升图片渲染质量
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        // 6. 开始渲染（添加 intent 确保离屏渲染稳定性）
        await page.render({
            canvasContext: context,
            viewport: viewport,
            intent: 'display'
        }).promise;

        // 7. 将 Canvas 转换为 Blob 并封装为 File 对象
        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // 移除原用户文件的 .pdf 后缀，替换为 .png
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Canvas toBlob 转换失败，未能生成图片。",
                        });
                    }
                },
                "image/png",
                1.0 // 1.0 表示最高画质
            );
        });
    } catch (err) {
        // 打印详细错误方便开发者在 F12 控制台排查
        console.error("PDF 转换失败详细日志:", err);
        return {
            imageUrl: "",
            file: null,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}