export default function AuthLayout({
    children
}: {
    children: React.ReactNode;
}) {
    // Passthrough: login owns full-bleed viewport (lg:grid lg:grid-cols-2).
    // Do not wrap in max-w-md — that crushes the two-column hero.
    return children;
}
