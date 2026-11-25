import type { ConditionId } from "./types";
export const DERM_API_URL = (process.env.NEXT_PUBLIC_DERM_API_URL ?? "").replace(/\/+$/, "");
export const DERM_CLASSES: ConditionId[] = ["eczema_dermatitis","psoriasis","fungal_infection","urticaria","insect_bite","acne_folliculitis","other"];

export async function predictDermRemote(img: HTMLImageElement) {
  if (!DERM_API_URL || !DERM_API_URL.startsWith("https://")) throw new Error("Derm Foundation backend is not configured.");
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image preparation failed.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const photo = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image encoding failed.")),"image/png"));
  if (photo.size > 10*1024*1024) throw new Error("Prepared photo exceeds 10 MB.");
  const response = await fetch(DERM_API_URL + "/predict", {method:"POST",headers:{"Content-Type":"image/png"},body:photo,cache:"no-store",credentials:"omit",signal:AbortSignal.timeout(120000)});
  if (!response.ok) throw new Error("Derm Foundation backend unavailable or busy. Choose local mode or retry.");
  const data = await response.json() as {model?:string;classes?:string[];scores?:number[]};
  if(data.model!=="derm-foundation"||!Array.isArray(data.classes)||data.classes.join(",")!==DERM_CLASSES.join(",")||!Array.isArray(data.scores)||data.scores.length!==7||data.scores.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(data.scores.reduce((a,b)=>a+b,0)-1)>.001) throw new Error("Invalid backend result.");
  return data.scores;
}
