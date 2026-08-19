import QRCode from "qrcode";

function verifyUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/verify/${token}`;
}

/**
 * The "Scan to Verify" QR for a pilot's digital license — links to the
 * public, no-login verify page. Server-rendered: the SVG comes from the
 * `qrcode` package encoding a URL we built ourselves (not user input), so
 * injecting it is safe.
 */
export async function VerifyQr({ token }: { token: string }) {
  const url = verifyUrl(token);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 160 });

  return (
    <div className="flex flex-col items-center gap-2 sm:items-start">
      <p className="text-xs font-medium text-muted-foreground">Scan to Verify</p>
      <div
        className="h-32 w-32 shrink-0 rounded-md border bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="max-w-40 text-center text-xs break-all text-muted-foreground sm:text-left">
        {url}
      </p>
    </div>
  );
}
