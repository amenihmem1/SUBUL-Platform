import "./globals.css";
import { platformBridgeScript } from "./platformBridge";


export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: platformBridgeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
