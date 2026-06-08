import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";

export default function AcceptInvitePage() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex flex-col items-center justify-center p-4"
      style={{ colorScheme: "light" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-2xl font-black">TF</span>
          </div>
          <h1 className="text-white text-2xl font-black">TrackFit Pro</h1>
          <p className="text-white/70 text-sm mt-1">Entrenamiento personalizado</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <AcceptInviteForm />
        </div>
      </div>
    </div>
  );
}
