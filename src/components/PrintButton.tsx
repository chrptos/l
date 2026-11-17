"use client";
export function PrintButton() {
  return <button className="btn-dark" onClick={() => window.print()}>印刷 / PDFで保存</button>;
}
